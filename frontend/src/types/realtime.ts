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
  | 'MEMBER_JOINED'
  | 'MEMBER_LEFT'
  | 'GROUP_UPDATED';

export interface GroupRealtimeEvent<T = unknown> {
  type: GroupEventType;
  groupId: number;
  actorId: number | null;
  payload: T;
  ts: string;
}

export type RealtimeMode = 'connecting' | 'sse' | 'polling' | 'disconnected';
