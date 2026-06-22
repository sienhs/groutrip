import { useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../lib/queryKeys';
import type { GroupRealtimeEvent, RealtimeMode } from '../types/realtime';
import { useGroupRealtime } from './useGroupRealtime';

interface UseGroupQuerySyncOptions {
  groupId: number | null;
  currentUserId?: number | null;
  enabled?: boolean;
}

/**
 * FR-SSE-03/04: 그룹 이벤트를 화면별 서버 상태 캐시 무효화로 변환하고,
 * SSE 장애 시 같은 범위의 데이터를 폴링으로 다시 조회한다.
 */
export function useGroupQuerySync({
  groupId,
  currentUserId = null,
  enabled = true,
}: UseGroupQuerySyncOptions): RealtimeMode {
  const queryClient = useQueryClient();

  const invalidateNotifications = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all });
  }, [queryClient]);

  const handleEvent = useCallback(
    async (event: GroupRealtimeEvent) => {
      const invalidations: Array<Promise<void>> = [invalidateNotifications()];

      switch (event.type) {
        case 'EXPENSE_ADDED':
        case 'EXPENSE_UPDATED':
        case 'EXPENSE_DELETED':
          invalidations.push(
            queryClient.invalidateQueries({ queryKey: queryKeys.expenses.group(event.groupId) }),
            queryClient.invalidateQueries({ queryKey: queryKeys.settlements.group(event.groupId) }),
          );
          break;
        case 'MEMBER_JOINED':
        case 'MEMBER_LEFT':
          invalidations.push(
            queryClient.invalidateQueries({ queryKey: queryKeys.groups.list() }),
            queryClient.invalidateQueries({ queryKey: queryKeys.groups.detail(event.groupId) }),
            queryClient.invalidateQueries({ queryKey: queryKeys.settlements.group(event.groupId) }),
          );
          break;
        case 'GROUP_UPDATED':
          invalidations.push(
            queryClient.invalidateQueries({ queryKey: queryKeys.groups.list() }),
            queryClient.invalidateQueries({ queryKey: queryKeys.groups.detail(event.groupId) }),
          );
          break;
        case 'SCHEDULE_ADDED':
        case 'SCHEDULE_UPDATED':
        case 'SCHEDULE_DELETED':
        case 'SCHEDULE_REORDERED':
          invalidations.push(
            queryClient.invalidateQueries({ queryKey: queryKeys.schedules.group(event.groupId) }),
          );
          break;
        case 'VOTE_CAST':
        case 'VOTE_CLOSED':
          invalidations.push(
            queryClient.invalidateQueries({ queryKey: queryKeys.votes.group(event.groupId) }),
            queryClient.invalidateQueries({ queryKey: queryKeys.schedules.group(event.groupId) }),
          );
          break;
        case 'PLACE_BOOKMARKED':
        case 'PLACE_REMOVED':
          invalidations.push(
            queryClient.invalidateQueries({ queryKey: queryKeys.places.group(event.groupId) }),
          );
          break;
      }

      await Promise.all(invalidations);
    },
    [invalidateNotifications, queryClient],
  );

  const pollGroupData = useCallback(async () => {
    if (groupId === null) {
      return;
    }

    await Promise.all([
      queryClient.invalidateQueries({ queryKey: queryKeys.groups.detail(groupId) }),
      queryClient.invalidateQueries({ queryKey: queryKeys.expenses.group(groupId) }),
      queryClient.invalidateQueries({ queryKey: queryKeys.settlements.group(groupId) }),
      queryClient.invalidateQueries({ queryKey: queryKeys.schedules.group(groupId) }),
      queryClient.invalidateQueries({ queryKey: queryKeys.places.group(groupId) }),
      queryClient.invalidateQueries({ queryKey: queryKeys.votes.group(groupId) }),
      invalidateNotifications(),
    ]);
  }, [groupId, invalidateNotifications, queryClient]);

  return useGroupRealtime({
    groupId,
    currentUserId,
    enabled,
    onEvent: handleEvent,
    onPoll: pollGroupData,
  });
}
