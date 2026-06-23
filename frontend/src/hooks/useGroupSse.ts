import { useEffect, useRef } from 'react';
import {
  fetchEventSource,
  EventStreamContentType,
  type EventSourceMessage,
} from '@microsoft/fetch-event-source';
import { getAccessToken } from '../api/instance';
import type { GroupEvent, GroupEventType } from '../types/sse';

/**
 * 그룹별 실시간(SSE) 구독 훅 — `@microsoft/fetch-event-source` 기반.
 *
 * 브라우저 내장 EventSource는 헤더를 못 실어 JWT를 못 보내므로,
 * fetch 기반인 이 라이브러리로 `Authorization: Bearer …`를 붙여 구독한다.
 *
 * 백엔드 계약(실제 코드 기준):
 *  - 엔드포인트: GET {VITE_API_BASE_URL}/api/groups/{groupId}/stream
 *    (예시의 /sse 가 아니라 실제 컨트롤러 경로는 /stream — SseController @RequestMapping)
 *  - 인증: @RequiredGroupMember (JWT) → Authorization 헤더 필수
 *  - 이벤트 이름: EventType enum 그대로 UPPER_SNAKE (EXPENSE_ADDED 등) + 시스템 CONNECTED/HEARTBEAT
 *  - data(JSON): SseEventPayload { type, groupId, actorId, payload, ts }
 *
 * 토큰은 localStorage가 아니라 메모리(Zustand/instance.ts)에서 getAccessToken()으로 가져온다.
 */

/** SSE 핸들러 — 키 이름은 백엔드 EventType 의미에 맞춘다(예: 생성=ADDED). */
export interface GroupSseHandlers {
  /** 구독 성공(서버 CONNECTED). */
  onConnected?: () => void;
  onScheduleAdded?: (e: GroupEvent) => void;
  onScheduleUpdated?: (e: GroupEvent) => void;
  onScheduleDeleted?: (e: GroupEvent) => void;
  onScheduleReordered?: (e: GroupEvent) => void;
  onVoteCast?: (e: GroupEvent) => void;
  onVoteClosed?: (e: GroupEvent) => void;
  onPlaceBookmarked?: (e: GroupEvent) => void;
  onPlaceRemoved?: (e: GroupEvent) => void;
  onExpenseAdded?: (e: GroupEvent) => void;
  onExpenseUpdated?: (e: GroupEvent) => void;
  onExpenseDeleted?: (e: GroupEvent) => void;
  onMemberJoined?: (e: GroupEvent) => void;
  onMemberLeft?: (e: GroupEvent) => void;
  onGroupUpdated?: (e: GroupEvent) => void;
  /** 모든 도메인 이벤트 공통 후처리(타입별 핸들러 다음에 호출). */
  onAny?: (e: GroupEvent) => void;
}

export interface UseGroupSseOptions {
  /** false면 구독하지 않음(예: 그룹 로딩 전). 기본 true. */
  enabled?: boolean;
  /**
   * 탭이 백그라운드여도 연결 유지. 기본 true.
   * false면 라이브러리가 탭 숨김 시 연결을 끊고 복귀 시 재구독한다.
   */
  openWhenHidden?: boolean;
}

/** EventType → 핸들러 키 매핑(백엔드가 보내는 실제 이벤트 이름 기준). */
const HANDLER_BY_TYPE: Record<GroupEventType, keyof GroupSseHandlers> = {
  SCHEDULE_ADDED: 'onScheduleAdded',
  SCHEDULE_UPDATED: 'onScheduleUpdated',
  SCHEDULE_DELETED: 'onScheduleDeleted',
  SCHEDULE_REORDERED: 'onScheduleReordered',
  VOTE_CAST: 'onVoteCast',
  VOTE_CLOSED: 'onVoteClosed',
  PLACE_BOOKMARKED: 'onPlaceBookmarked',
  PLACE_REMOVED: 'onPlaceRemoved',
  EXPENSE_ADDED: 'onExpenseAdded',
  EXPENSE_UPDATED: 'onExpenseUpdated',
  EXPENSE_DELETED: 'onExpenseDeleted',
  MEMBER_JOINED: 'onMemberJoined',
  MEMBER_LEFT: 'onMemberLeft',
  GROUP_UPDATED: 'onGroupUpdated',
};

/** onopen/onerror에서 던지면 라이브러리가 재시도하지 않고 종료(치명적). */
class SseFatalError extends Error {}

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? '';

/**
 * 그룹 SSE 구독. groupId가 바뀌거나 언마운트되면 AbortController로 정리한다.
 *
 * @example
 *   useGroupSse(groupId, {
 *     onExpenseAdded: (e) => setExpenses((p) => [e.payload as Expense, ...p]),
 *     onAny: () => refetch(),
 *   });
 */
export function useGroupSse(
  groupId: number | null | undefined,
  handlers: GroupSseHandlers,
  options: UseGroupSseOptions = {},
): void {
  const { enabled = true, openWhenHidden = true } = options;

  // 핸들러는 매 렌더마다 새 참조일 수 있다. ref에 담아 두면(렌더 중이 아니라 effect에서 갱신)
  // 핸들러 변경만으로 SSE가 재연결되는 것을 막는다 → 의존성은 [groupId, enabled]로 고정.
  const handlersRef = useRef(handlers);
  useEffect(() => {
    handlersRef.current = handlers;
  });

  useEffect(() => {
    if (!enabled || !groupId) return;

    const controller = new AbortController();
    const url = `${API_BASE}/api/groups/${groupId}/stream`;

    const dispatch = (msg: EventSourceMessage) => {
      const name = msg.event; // SSE event: 필드 = EventType 이름(UPPER_SNAKE) 또는 CONNECTED/HEARTBEAT
      if (name === 'HEARTBEAT' || name === '') return; // keepalive / 익명 ping 무시
      if (name === 'CONNECTED') {
        console.info(`[SSE] connected group=${groupId}`);
        handlersRef.current.onConnected?.();
        return;
      }

      const handlerKey = HANDLER_BY_TYPE[name as GroupEventType];
      if (!handlerKey) {
        console.warn(`[SSE] 알 수 없는 이벤트: ${name}`);
        return;
      }

      let event: GroupEvent;
      try {
        event = JSON.parse(msg.data) as GroupEvent;
      } catch (err) {
        console.error(`[SSE] data 파싱 실패 event=${name}`, err, msg.data);
        return;
      }

      const handler = handlersRef.current[handlerKey] as ((e: GroupEvent) => void) | undefined;
      handler?.(event);
      handlersRef.current.onAny?.(event);
    };

    fetchEventSource(url, {
      signal: controller.signal,
      openWhenHidden,
      headers: {
        Authorization: `Bearer ${getAccessToken() ?? ''}`,
        Accept: EventStreamContentType,
      },
      async onopen(res) {
        if (res.ok && res.headers.get('content-type')?.includes(EventStreamContentType)) {
          return; // 정상 — CONNECTED 메시지가 곧 도착
        }
        if (res.status === 401 || res.status === 403) {
          // TODO: 액세스 토큰 만료/권한 부족 가능성.
          //  헤더 토큰은 구독 시점 값으로 고정되므로 갱신돼도 자동 반영되지 않는다.
          //  api/instance.ts의 reissue 흐름으로 토큰을 갱신한 뒤 재구독(groupId 키 재설정)하도록 연동 고려.
          console.error(`[SSE] 인증 실패(${res.status}) group=${groupId} — 재시도 안 함`);
          throw new SseFatalError(`SSE auth ${res.status}`);
        }
        console.error(`[SSE] 예기치 못한 응답 ${res.status} group=${groupId}`);
        throw new SseFatalError(`SSE open ${res.status}`);
      },
      onmessage: dispatch,
      onerror(err) {
        if (err instanceof SseFatalError) throw err; // 치명적 → 재시도 중단
        console.warn(`[SSE] 연결 오류, 재시도 예정 group=${groupId}`, err);
        return 5000; // 5초 후 자동 재연결
      },
      onclose() {
        // 서버가 스트림을 닫으면 라이브러리는 재연결을 시도한다(치명적 오류 throw 시 중단).
        console.info(`[SSE] 연결 종료 group=${groupId}`);
      },
    }).catch((err) => {
      if (controller.signal.aborted) return; // 정상 정리(언마운트/groupId 변경)
      console.error(`[SSE] 구독 종료 group=${groupId}`, err);
    });

    return () => controller.abort();
    // handlers는 ref로 처리하므로 의존성에서 제외 — groupId/enabled/openWhenHidden 변경 시에만 재구독.
  }, [groupId, enabled, openWhenHidden]);
}
