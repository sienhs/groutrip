import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  getNotifications,
  getUnreadNotificationCount,
  markAllNotificationsRead,
  markNotificationRead,
} from '../api/notification';
import { queryKeys } from '../lib/queryKeys';
import type { NotificationResponse } from '../types/notification';

export function useNotificationsQuery(enabled = true) {
  return useQuery({
    queryKey: queryKeys.notifications.list(),
    queryFn: getNotifications,
    enabled,
  });
}

export function useUnreadNotificationCountQuery(enabled = true) {
  return useQuery({
    queryKey: queryKeys.notifications.unreadCount(),
    queryFn: getUnreadNotificationCount,
    enabled,
  });
}

export function useMarkNotificationReadMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: markNotificationRead,
    onSuccess: (updatedNotification) => {
      queryClient.setQueryData<NotificationResponse[]>(
        queryKeys.notifications.list(),
        (notifications) =>
          notifications?.map((notification) =>
            notification.id === updatedNotification.id ? updatedNotification : notification,
          ),
      );
      void queryClient.invalidateQueries({ queryKey: queryKeys.notifications.unreadCount() });
    },
  });
}

export function useMarkAllNotificationsReadMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: markAllNotificationsRead,
    onSuccess: async () => {
      // 서버가 일괄 처리 시각을 반환하지 않으므로 임의 시각을 넣지 않고 전체 알림 캐시를 재조회한다.
      await queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all });
    },
  });
}
