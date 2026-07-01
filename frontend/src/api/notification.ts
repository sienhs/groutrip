import instance from './instance';
import type { ApiResponse } from '../types/auth';
import { EVENT_META, type AppNotification, type GroupEventType } from '../types/sse';

/**
 * 알림 API — 서버(DB)에 저장된 알림을 조회/읽음 처리한다.
 * 서버 저장이라 기기가 바뀌어도 같은 알림을 볼 수 있다(로컬스토리지 대체).
 */

// 백엔드 NotificationResponse 원형.
interface NotificationApiResponse {
  id: number;
  groupId: number;
  type: GroupEventType;
  message: string;
  targetPath: string;
  readAt: string | null;
  createdAt: string;
}

// 서버 응답 → 화면용 AppNotification. 토스트 색상은 type에서 파생한다.
const toAppNotification = (r: NotificationApiResponse): AppNotification => ({
  id: r.id,
  groupId: r.groupId,
  type: r.type,
  message: r.message,
  targetPath: r.targetPath,
  toast: EVENT_META[r.type]?.toast ?? 'info',
  ts: r.createdAt,
  read: r.readAt != null,
});

/** 내 알림 목록(최신순). */
export const listNotifications = (): Promise<AppNotification[]> =>
  instance
    .get<ApiResponse<NotificationApiResponse[]>>('/api/notifications')
    .then((r) => r.data.data.map(toAppNotification));

/** 안 읽은 알림 개수. */
export const getUnreadCount = (): Promise<number> =>
  instance
    .get<ApiResponse<{ count: number }>>('/api/notifications/unread-count')
    .then((r) => r.data.data.count);

/** 알림 하나 읽음 처리. */
export const markNotificationRead = (id: number): Promise<void> =>
  instance.patch(`/api/notifications/${id}/read`).then(() => undefined);

/** 모든 알림 읽음 처리. */
export const markAllNotificationsRead = (): Promise<void> =>
  instance.patch('/api/notifications/read-all').then(() => undefined);
