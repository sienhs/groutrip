import type { GroupEventType } from '../types/sse';

/**
 * 그룹 상세 화면의 React Query 키 표준.
 *
 * 모든 키는 `[domain, groupId, ...]` 형태로 시작해, prefix 무효화가 가능하다.
 * 예: `invalidateQueries({ queryKey: ['bookmarks', groupId] })` 는
 *     필터/정렬이 붙은 `['bookmarks', groupId, 'FOOD', 'RECENT']` 까지 모두 무효화한다.
 */
export const groupQueryKeys = {
  /** 그룹 기본 정보(GroupDetailPage 배너). */
  detail: (groupId: number) => ['group', groupId, 'detail'] as const,
  /** 그룹 멤버 목록. */
  members: (groupId: number) => ['group', groupId, 'members'] as const,
  /** 여행 계획(숙소) 존재 여부 — SSE 비대상. */
  plan: (groupId: number) => ['group', groupId, 'plan'] as const,
  /** 일정 빌더. */
  schedules: (groupId: number) => ['schedules', groupId] as const,
  /** 장소 보관함(필터/정렬은 뒤에 덧붙는다). */
  bookmarks: (groupId: number) => ['bookmarks', groupId] as const,
  /** 지출/정산 요약. */
  expenses: (groupId: number) => ['expenses', groupId] as const,
  /** 투표 세션 목록. */
  votes: (groupId: number) => ['votes', groupId] as const,
} as const;

/**
 * SSE 이벤트 타입 → 무효화할 query key 목록 매핑.
 * 타입 안정성: GroupEventType 전수 switch라 새 이벤트가 추가되면 컴파일이 강제한다.
 */
export function invalidationKeysForEvent(
  type: GroupEventType,
  groupId: number,
): readonly (readonly unknown[])[] {
  switch (type) {
    case 'SCHEDULE_ADDED':
    case 'SCHEDULE_UPDATED':
    case 'SCHEDULE_DELETED':
    case 'SCHEDULE_REORDERED':
      return [groupQueryKeys.schedules(groupId)];
    case 'VOTE_CAST':
      return [groupQueryKeys.votes(groupId)];
    case 'VOTE_CLOSED':
      // 마감 시 채택 장소가 빈 일정에 반영될 수 있어 일정도 함께 갱신.
      return [groupQueryKeys.votes(groupId), groupQueryKeys.schedules(groupId)];
    case 'PLACE_BOOKMARKED':
    case 'PLACE_REMOVED':
      return [groupQueryKeys.bookmarks(groupId)];
    case 'EXPENSE_ADDED':
    case 'EXPENSE_UPDATED':
    case 'EXPENSE_DELETED':
    case 'SETTLEMENT_UPDATED':
      return [groupQueryKeys.expenses(groupId)];
    case 'MEMBER_JOINED':
    case 'MEMBER_LEFT':
      // 멤버 수 변화가 배너에도 반영되므로 detail 도 함께.
      return [groupQueryKeys.members(groupId), groupQueryKeys.detail(groupId)];
    case 'GROUP_UPDATED':
      return [groupQueryKeys.detail(groupId), groupQueryKeys.members(groupId)];
    default: {
      // 전수 처리 보장: 새 이벤트 타입 추가 시 컴파일 에러.
      const _exhaustive: never = type;
      return _exhaustive;
    }
  }
}

/** 폴링 폴백에서 한꺼번에 무효화할 그룹 상세 전 도메인 키. */
export function allGroupQueryKeys(groupId: number): readonly (readonly unknown[])[] {
  return [
    groupQueryKeys.detail(groupId),
    groupQueryKeys.members(groupId),
    groupQueryKeys.schedules(groupId),
    groupQueryKeys.bookmarks(groupId),
    groupQueryKeys.expenses(groupId),
    groupQueryKeys.votes(groupId),
  ];
}
