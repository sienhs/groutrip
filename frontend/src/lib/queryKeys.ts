import type { ExpenseFilters } from '../types/expense';

export const queryKeys = {
  groups: {
    all: ['groups'] as const,
    list: () => [...queryKeys.groups.all, 'list'] as const,
    detail: (groupId: number) => [...queryKeys.groups.all, groupId] as const,
    members: (groupId: number) => [...queryKeys.groups.detail(groupId), 'members'] as const,
  },
  expenses: {
    group: (groupId: number) => ['groups', groupId, 'expenses'] as const,
    list: (groupId: number, filters: ExpenseFilters = {}) =>
      [...queryKeys.expenses.group(groupId), 'list', filters] as const,
    summary: (groupId: number, filters: ExpenseFilters = {}) =>
      [...queryKeys.expenses.group(groupId), 'summary', filters] as const,
  },
  settlements: {
    group: (groupId: number) => ['groups', groupId, 'settlements'] as const,
    summary: (groupId: number) => [...queryKeys.settlements.group(groupId), 'summary'] as const,
    progress: (groupId: number) => [...queryKeys.settlements.group(groupId), 'progress'] as const,
    paymentLinks: (groupId: number, settlementId: number) =>
      [...queryKeys.settlements.group(groupId), settlementId, 'payment-links'] as const,
  },
  notifications: {
    all: ['notifications'] as const,
    list: () => [...queryKeys.notifications.all, 'list'] as const,
    unreadCount: () => [...queryKeys.notifications.all, 'unread-count'] as const,
  },
  schedules: {
    group: (groupId: number) => ['groups', groupId, 'schedules'] as const,
  },
  places: {
    group: (groupId: number) => ['groups', groupId, 'places'] as const,
  },
  votes: {
    group: (groupId: number) => ['groups', groupId, 'votes'] as const,
  },
};
