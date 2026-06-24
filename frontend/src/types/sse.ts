/**
 * 그룹 실시간(SSE) 이벤트 타입 — 브리프 7 / 8-3.
 * 페이로드 공통 형태: { type, groupId, actorId, payload, ts }.
 */

export type GroupEventType =
  | 'SCHEDULE_ADDED'
  | 'SCHEDULE_UPDATED'
  | 'SCHEDULE_DELETED'
  | 'SCHEDULE_REORDERED'
  | 'VOTE_CAST'
  | 'VOTE_CLOSED'
  | 'PLACE_BOOKMARKED'
  | 'PLACE_REMOVED'
  | 'EXPENSE_ADDED'
  | 'EXPENSE_UPDATED'
  | 'EXPENSE_DELETED'
  | 'SETTLEMENT_UPDATED'
  | 'MEMBER_JOINED'
  | 'MEMBER_LEFT'
  | 'GROUP_UPDATED';

export interface GroupEvent<T = unknown> {
  type: GroupEventType;
  groupId: number;
  /** 이벤트 발생자 userId. 본인이면 무시(중복 반영 방지). */
  actorId: number;
  /** 이벤트 발생자 닉네임(백엔드가 채워줌). 없으면 클라 멤버 캐시로 보조. */
  actorName?: string | null;
  payload: T;
  /** ISO datetime */
  ts: string;
}

import type { ToastType } from '../components/Toast';

/** 무효화할 React Query 키 도메인. 실제 키는 [domain, groupId]. */
type QueryDomain = 'schedules' | 'votes' | 'bookmarks' | 'expenses' | 'group';

interface EventMeta {
  /** "{actor}님이 {text}" 로 합성. */
  text: string;
  toast: ToastType;
  domain: QueryDomain;
}

export const EVENT_META: Record<GroupEventType, EventMeta> = {
  SCHEDULE_ADDED: { text: '일정을 추가했습니다', toast: 'info', domain: 'schedules' },
  SCHEDULE_UPDATED: { text: '일정을 수정했습니다', toast: 'info', domain: 'schedules' },
  SCHEDULE_DELETED: { text: '일정을 삭제했습니다', toast: 'info', domain: 'schedules' },
  SCHEDULE_REORDERED: { text: '일정 순서를 변경했습니다', toast: 'info', domain: 'schedules' },
  VOTE_CAST: { text: '투표했습니다', toast: 'info', domain: 'votes' },
  VOTE_CLOSED: { text: '투표를 마감했습니다', toast: 'warning', domain: 'votes' },
  PLACE_BOOKMARKED: { text: '장소를 보관함에 담았습니다', toast: 'info', domain: 'bookmarks' },
  PLACE_REMOVED: { text: '장소를 보관함에서 뺐습니다', toast: 'info', domain: 'bookmarks' },
  EXPENSE_ADDED: { text: '지출을 추가했습니다', toast: 'success', domain: 'expenses' },
  EXPENSE_UPDATED: { text: '지출을 수정했습니다', toast: 'info', domain: 'expenses' },
  EXPENSE_DELETED: { text: '지출을 삭제했습니다', toast: 'info', domain: 'expenses' },
  // 정산 변화는 토스트/알림 없이 화면만 갱신(useGroupStream에서 silent 처리). 메타는 형식상 존재.
  SETTLEMENT_UPDATED: { text: '정산을 업데이트했습니다', toast: 'info', domain: 'expenses' },
  MEMBER_JOINED: { text: '그룹에 참여했습니다', toast: 'success', domain: 'group' },
  MEMBER_LEFT: { text: '그룹에서 나갔습니다', toast: 'warning', domain: 'group' },
  GROUP_UPDATED: { text: '그룹 정보를 변경했습니다', toast: 'info', domain: 'group' },
};

/** 알림 목록/드롭다운에서 쓰는 정규화된 알림 항목. */
export interface AppNotification {
  id: string;
  groupId: number;
  type: GroupEventType;
  message: string;
  toast: ToastType;
  ts: string;
  read: boolean;
}
