import type { GroupEventType } from '../types/sse';

/** 알림 종류 → 그룹 상세의 어느 탭으로 보낼지(GroupDetailPage가 ?tab= 으로 읽음). */
export function tabForType(type: GroupEventType): string | null {
  if (type.startsWith('SCHEDULE')) return 'schedule';
  if (type.startsWith('VOTE')) return 'vote';
  if (type.startsWith('PLACE')) return 'place';
  if (type.startsWith('EXPENSE')) return 'settle';
  if (type.startsWith('MEMBER')) return 'member';
  return null; // GROUP_UPDATED 등은 그룹 홈으로
}

/** 알림 클릭 시 이동할 경로(딥링크). */
export function pathForNotification(n: { groupId: number; type: GroupEventType }): string {
  const tab = tabForType(n.type);
  return `/groups/${n.groupId}${tab ? `?tab=${tab}` : ''}`;
}

/** 상대 시간 표기(방금/N분 전/N시간 전/N일 전). */
export function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60_000);
  if (m < 1) return '방금';
  if (m < 60) return `${m}분 전`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}시간 전`;
  return `${Math.floor(h / 24)}일 전`;
}
