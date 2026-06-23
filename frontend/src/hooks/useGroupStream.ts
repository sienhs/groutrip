import { useEffect, useRef } from 'react';
// ⚠️ 추가 필요 패키지 — 설치 후 동작:
//   npm i event-source-polyfill @tanstack/react-query
//   npm i -D @types/event-source-polyfill
import { EventSourcePolyfill } from 'event-source-polyfill';
import { useQueryClient } from '@tanstack/react-query';
import { useToast } from '../components/Toast';
import { useNotificationStore } from '../store/notificationStore';
import { EVENT_META, type GroupEvent, type GroupEventType } from '../types/sse';
import { getAccessToken } from '../api/instance';

const ALL_EVENT_TYPES = Object.keys(EVENT_META) as GroupEventType[];
const HEARTBEAT_TIMEOUT = 45_000; // 서버 하트비트 30초 + 여유
const MAX_RETRIES = 3; // 3회 실패 시 폴링 폴백
const POLL_INTERVAL = 5_000;

interface Options {
  groupId: number;
  /** 본인 발생 이벤트 무시용 */
  currentUserId: number;
  /** actorId → 표시 이름. 미지정 시 '멤버' */
  resolveActorName?: (actorId: number) => string;
  /**
   * 다른 멤버의 이벤트 수신 시 호출(domain 전달). 화면 데이터가 React Query가 아니라
   * 수동 fetch라 invalidateQueries만으로는 갱신되지 않으므로, 호출부가 실제 refetch를
   * 트리거하도록 한다. 안정적인 참조(useCallback)로 넘겨야 재연결을 막는다.
   */
  onEvent?: (domain: string) => void;
  enabled?: boolean;
}

const DOMAINS = ['schedules', 'votes', 'bookmarks', 'expenses', 'group'] as const;

/**
 * 그룹 상세 SSE 구독 훅 (브리프 7).
 *  - GET /api/groups/{id}/stream, Authorization 헤더(EventSourcePolyfill)
 *  - 하트비트 30초, 3회 연속 실패 시 5초 폴링 폴백
 *  - 본인(actorId === currentUserId) 이벤트는 무시
 *  - 수신 시: 토스트 + 알림 스토어 push + React Query 캐시 무효화
 */
export function useGroupStream({ groupId, currentUserId, resolveActorName, onEvent, enabled = true }: Options) {
  const queryClient = useQueryClient();
  const toast = useToast();
  const addNotification = useNotificationStore((s) => s.add);

  const esRef = useRef<EventSource | null>(null);
  const retriesRef = useRef(0);
  const pollRef = useRef<number | null>(null);
  const reconnectRef = useRef<number | null>(null);

  useEffect(() => {
    if (!enabled || !groupId) return;

    const invalidate = (domain: string) =>
      queryClient.invalidateQueries({ queryKey: [domain, groupId] });

    const startPolling = () => {
      if (pollRef.current != null) return;
      pollRef.current = window.setInterval(() => {
        DOMAINS.forEach(invalidate);
      }, POLL_INTERVAL);
    };
    const stopPolling = () => {
      if (pollRef.current != null) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
    };

    const handle = (raw: MessageEvent) => {
      let evt: GroupEvent;
      try {
        evt = JSON.parse(raw.data) as GroupEvent;
      } catch {
        return;
      }
      // 본인 이벤트 무시
      if (evt.actorId === currentUserId) {
        invalidate(EVENT_META[evt.type]?.domain ?? 'group'); // 캐시는 갱신
        return;
      }
      const meta = EVENT_META[evt.type];
      if (!meta) return;

      const actor = resolveActorName?.(evt.actorId) ?? '멤버';
      const message = `${actor}님이 ${meta.text}`;

      toast.show(meta.toast, message);
      addNotification({
        id: `${evt.type}-${evt.ts}-${evt.actorId}`,
        groupId: evt.groupId,
        type: evt.type,
        message,
        toast: meta.toast,
        ts: evt.ts,
        read: false,
      });
      invalidate(meta.domain);
      onEvent?.(meta.domain); // 수동 fetch 화면 실제 refetch 트리거
    };

    const connect = () => {
      const base = import.meta.env.VITE_API_BASE_URL ?? '';
      // SSE 는 axios 인터셉터를 안 타므로 토큰을 직접 주입(instance.ts 의 모듈 변수).
      const token = getAccessToken();

      const es = new EventSourcePolyfill(`${base}/api/groups/${groupId}/stream`, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        heartbeatTimeout: HEARTBEAT_TIMEOUT,
        withCredentials: true,
      }) as unknown as EventSource;

      es.onopen = () => {
        retriesRef.current = 0;
        stopPolling();
      };
      // 서버가 named event(.name(type))로 보낼 때 + 기본 message 둘 다 대응
      ALL_EVENT_TYPES.forEach((t) => es.addEventListener(t, handle as EventListener));
      es.onmessage = handle;

      es.onerror = () => {
        es.close();
        esRef.current = null;
        retriesRef.current += 1;
        if (retriesRef.current <= MAX_RETRIES) {
          reconnectRef.current = window.setTimeout(connect, 1000 * retriesRef.current);
        } else {
          startPolling(); // 폴백
        }
      };

      esRef.current = es;
    };

    connect();

    return () => {
      esRef.current?.close();
      esRef.current = null;
      stopPolling();
      if (reconnectRef.current != null) clearTimeout(reconnectRef.current);
    };
  }, [groupId, currentUserId, enabled, queryClient, toast, addNotification, resolveActorName, onEvent]);
}
