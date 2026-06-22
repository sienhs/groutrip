import { useEffect, useRef, useState } from 'react';
import {
  EventSourcePolyfill,
  type Event as PolyfillEvent,
} from 'event-source-polyfill';
import { getAccessToken } from '../api/instance';
import type { GroupEventType, GroupRealtimeEvent, RealtimeMode } from '../types/realtime';

const MAX_SSE_FAILURES = 3;
const POLLING_INTERVAL_MILLIS = 5_000;
const HEARTBEAT_TIMEOUT_MILLIS = 5 * 60 * 1_000;

const GROUP_EVENT_TYPES: GroupEventType[] = [
  'SCHEDULE_ADDED',
  'SCHEDULE_UPDATED',
  'SCHEDULE_DELETED',
  'SCHEDULE_REORDERED',
  'VOTE_CAST',
  'VOTE_CLOSED',
  'PLACE_BOOKMARKED',
  'PLACE_REMOVED',
  'EXPENSE_ADDED',
  'EXPENSE_UPDATED',
  'EXPENSE_DELETED',
  'MEMBER_JOINED',
  'MEMBER_LEFT',
  'GROUP_UPDATED',
];

interface UseGroupRealtimeOptions {
  groupId: number | null;
  currentUserId?: number | null;
  enabled?: boolean;
  onEvent: (event: GroupRealtimeEvent) => void;
  onPoll: () => void | Promise<void>;
}

/**
 * FR-SSE-03/04: 그룹 SSE 이벤트를 전달하고 3회 연속 실패하면 5초 폴링으로 전환한다.
 * 소비 화면은 onEvent에서 캐시를 무효화하고 onPoll에서 그룹 데이터를 다시 조회한다.
 */
export function useGroupRealtime({
  groupId,
  currentUserId = null,
  enabled = true,
  onEvent,
  onPoll,
}: UseGroupRealtimeOptions): RealtimeMode {
  const [mode, setMode] = useState<RealtimeMode>('disconnected');
  const onEventRef = useRef(onEvent);
  const onPollRef = useRef(onPoll);
  const currentUserIdRef = useRef(currentUserId);

  useEffect(() => {
    onEventRef.current = onEvent;
  }, [onEvent]);

  useEffect(() => {
    onPollRef.current = onPoll;
  }, [onPoll]);

  useEffect(() => {
    currentUserIdRef.current = currentUserId;
  }, [currentUserId]);

  useEffect(() => {
    if (!enabled || groupId === null) {
      return;
    }

    let eventSource: EventSourcePolyfill | null = null;
    let retryTimer: ReturnType<typeof setTimeout> | null = null;
    let pollingTimer: ReturnType<typeof setInterval> | null = null;
    let failureCount = 0;
    let disposed = false;

    const runPoll = () => {
      void Promise.resolve(onPollRef.current()).catch(() => undefined);
    };

    const startPolling = () => {
      eventSource?.close();
      eventSource = null;
      if (pollingTimer !== null) {
        return;
      }
      setMode('polling');
      runPoll();
      pollingTimer = setInterval(runPoll, POLLING_INTERVAL_MILLIS);
    };

    const handleEvent = (rawEvent: PolyfillEvent) => {
      try {
        if (!('data' in rawEvent)) {
          return;
        }
        const event = JSON.parse(String(rawEvent.data)) as GroupRealtimeEvent;
        if (event.groupId !== groupId || event.actorId === currentUserIdRef.current) {
          return;
        }
        onEventRef.current(event);
      } catch {
        // 손상되거나 계약과 다른 이벤트 하나가 전체 실시간 연결을 중단시키지 않게 한다.
      }
    };

    const connect = () => {
      if (disposed) {
        return;
      }

      const accessToken = getAccessToken();
      if (!accessToken) {
        startPolling();
        return;
      }

      setMode('connecting');
      const baseUrl = (import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/$/, '');
      eventSource = new EventSourcePolyfill(`${baseUrl}/api/groups/${groupId}/stream`, {
        headers: { Authorization: `Bearer ${accessToken}` },
        withCredentials: true,
        heartbeatTimeout: HEARTBEAT_TIMEOUT_MILLIS,
      });

      eventSource.onopen = () => {
        failureCount = 0;
        setMode('sse');
      };

      for (const eventType of GROUP_EVENT_TYPES) {
        eventSource.addEventListener(eventType, handleEvent);
      }

      eventSource.onerror = () => {
        eventSource?.close();
        eventSource = null;
        failureCount += 1;

        if (failureCount >= MAX_SSE_FAILURES) {
          startPolling();
          return;
        }

        retryTimer = setTimeout(connect, failureCount * 1_000);
      };
    };

    connect();

    return () => {
      disposed = true;
      eventSource?.close();
      if (retryTimer !== null) {
        clearTimeout(retryTimer);
      }
      if (pollingTimer !== null) {
        clearInterval(pollingTimer);
      }
    };
  }, [enabled, groupId]);

  return enabled && groupId !== null ? mode : 'disconnected';
}
