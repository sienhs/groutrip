import instance from './instance';
import type { ApiResponse } from '../types/auth';
import type { NotificationResponse } from '../types/notification';

export const getNotifications = async (): Promise<NotificationResponse[]> => {
  const response = await instance.get<ApiResponse<NotificationResponse[]>>('/api/notifications');
  return response.data.data;
};

export const getUnreadNotificationCount = async (): Promise<number> => {
  const response = await instance.get<ApiResponse<{ count: number }>>('/api/notifications/unread-count');
  return response.data.data.count;
};

export const markNotificationRead = async (notificationId: number): Promise<NotificationResponse> => {
  const response = await instance.patch<ApiResponse<NotificationResponse>>(
    `/api/notifications/${notificationId}/read`,
  );
  return response.data.data;
};

export const markAllNotificationsRead = async (): Promise<void> => {
  await instance.patch('/api/notifications/read-all');
};
