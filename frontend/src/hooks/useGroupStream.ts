import { useEffect, useRef } from 'react';
import {
  fetchEventSource,
  EventStreamContentType,
  type EventSourceMessage,
} from '@microsoft/fetch-event-source';
import { useQueryClient } from '@tanstack/react-query';
import { useToast } from '../components/Toast';
import { useNotificationStore } from '../store/notificationStore';
import { EVENT_META, type GroupEvent, type GroupEventType } from '../types/sse';
import { allGroupQueryKeys, invalidationKeysForEvent } from '../queryKeys/groupQueryKeys';
import { getAccessToken } from '../api/instance';

const MAX_RETRIES = 3; // 3회 연속 실패 시 폴링 폴백
const POLL_INTERVAL = 5_000;
const API_BASE = import.meta.env.VITE_API_BASE_URL ?? '';

/** onopen/onerror에서 던지면 라이브러리가 재시도하지 않고 종료(치명적). */
class SseFatalError extends Error {}

interface Options {
  groupId: number;
  /** 본인 발생 이벤트 무시용 */
  currentUserId: number;
  /** actorId → 표시 이름. 미지정 시 '멤버' */
  resolveActorName?: (actorId: number) => string;
  enabled?: boolean;
}

/**
 * 그룹 상세 SSE 구독 훅 — `@microsoft/fetch-event-source` 기반.
 *
 * 브라우저 내장 EventSource는 헤더를 못 실어 JWT를 못 보내므로(이전엔 event-source-polyfill 사용),
 * fetch 기반인 이 라이브러리로 `Authorization: Bearer …`를 붙여 구독한다.
 * fetch 기반이라 onopen에서 HTTP 상태코드(401/403 등)를 직접 보고 에러코드별로 동작을 달리할 수 있다.
 *
 *  - GET /api/groups/{id}/stream, Authorization 헤더
 *  - 401/403(인증·권한 실패)은 재시도해도 동일하므로 즉시 중단 후 폴링 폴백
 *  - 그 외 연결 오류는 점증 백오프로 재시도, 3회 초과 시 5초 폴링 폴백
 *  - 본인(actorId === currentUserId) 이벤트는 토스트/알림 생략, 캐시만 갱신
 *  - 수신 시: 이벤트 타입별로 영향받는 React Query 키만 정밀 무효화(전체 remount 아님)
 */
export function useGroupStream({ groupId, currentUserId, resolveActorName, enabled = true }: Options) {
  const queryClient = useQueryClient();
  const toast = useToast();
  const addNotification = useNotificationStore((s) => s.add);

  // resolveActorName은 멤버 로딩 시 참조가 바뀐다. ref로 고정해 변경만으로 SSE가
  // 재연결되는 것을 막는다 → 의존성은 [groupId, currentUserId, enabled]로 한정.
  const resolveActorNameRef = useRef(resolveActorName);
  useEffect(() => {
    resolveActorNameRef.current = resolveActorName;
  });

  const pollRef = useRef<number | null>(null);
  const retriesRef = useRef(0);

  useEffect(() => {
    if (!enabled || !groupId) return;

    const controller = new AbortController();

    // 이벤트 타입 → 영향받는 query key만 정밀 무효화.
    const invalidateForEvent = (type: GroupEventType) =>
      invalidationKeysForEvent(type, groupId).forEach((queryKey) =>
        queryClient.invalidateQueries({ queryKey }),
      );

    const startPolling = () => {
      if (pollRef.current != null) return;
      pollRef.current = window.setInterval(() => {
        allGroupQueryKeys(groupId).forEach((queryKey) =>
          queryClient.invalidateQueries({ queryKey }),
        );
      }, POLL_INTERVAL);
    };
    const stopPolling = () => {
      if (pollRef.current != null) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
    };

    const dispatch = (msg: EventSourceMessage) => {
      const name = msg.event; // EventType 이름(UPPER_SNAKE) 또는 시스템 CONNECTED/HEARTBEAT
      if (name === 'HEARTBEAT' || name === 'CONNECTED' || name === '') return;

      let evt: GroupEvent;
      try {
        evt = JSON.parse(msg.data) as GroupEvent;
      } catch {
        return;
      }

      // 본인 이벤트: 토스트/알림은 생략하되 영향받는 캐시는 갱신(낙관적 업데이트와 중복 방지).
      if (evt.actorId === currentUserId) {
        invalidateForEvent(evt.type);
        return;
      }

      const meta = EVENT_META[evt.type];
      if (!meta) return;

      const actor = resolveActorNameRef.current?.(evt.actorId) ?? '멤버';
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
      invalidateForEvent(evt.type);
    };

    fetchEventSource(`${API_BASE}/api/groups/${groupId}/stream`, {
      signal: controller.signal,
      openWhenHidden: true, // 탭이 백그라운드여도 연결 유지
      headers: {
        // SSE는 axios 인터셉터를 안 타므로 토큰을 직접 주입(instance.ts의 메모리 변수).
        Authorization: `Bearer ${getAccessToken() ?? ''}`,
        Accept: EventStreamContentType,
      },
      async onopen(res) {
        if (res.ok && res.headers.get('content-type')?.includes(EventStreamContentType)) {
          retriesRef.current = 0;
          stopPolling();
          return; // 정상 — CONNECTED 메시지가 곧 도착
        }
        if (res.status === 401 || res.status === 403) {
          // 인증/권한 실패: 같은 토큰으로 재시도해도 동일하므로 중단.
          //  (토큰 갱신 후 재구독은 상위에서 groupId 키 재설정으로 처리)
          throw new SseFatalError(`SSE auth ${res.status}`);
        }
        // 그 외(5xx 등)는 일시적일 수 있으므로 재시도 대상.
        throw new Error(`SSE open ${res.status}`);
      },
      onmessage: dispatch,
      onerror(err) {
        if (err instanceof SseFatalError) throw err; // 치명적 → 재시도 중단
        retriesRef.current += 1;
        if (retriesRef.current > MAX_RETRIES) {
          startPolling(); // 폴백: 재연결을 계속 시도하되 그동안 폴링으로 데이터 갱신
        }
        return Math.min(1000 * retriesRef.current, POLL_INTERVAL); // 점증 백오프
      },
    }).catch((err) => {
      if (controller.signal.aborted) return; // 정상 정리(언마운트/groupId 변경)
      // 치명적 종료(인증 실패 등): SSE는 끊겼지만 폴링으로라도 데이터는 갱신되게.
      startPolling();
      console.error(`[SSE] 구독 종료 group=${groupId}`, err);
    });

    return () => {
      controller.abort();
      stopPolling();
    };
  }, [groupId, currentUserId, enabled, queryClient, toast, addNotification]);
}
