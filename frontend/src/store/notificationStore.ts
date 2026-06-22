import { create } from 'zustand';
import type { AppNotification } from '../types/sse';

/**
 * 실시간 알림 스토어(Zustand). useGroupStream 이 push, NotificationBell 이 소비.
 * 최근 50개만 유지(메모리). 영속이 필요하면 persist 미들웨어 추가.
 */
interface NotificationState {
  items: AppNotification[];
  unread: number;
  add: (n: AppNotification) => void;
  markAllRead: () => void;
  clear: () => void;
}

const MAX = 50;

export const useNotificationStore = create<NotificationState>((set) => ({
  items: [],
  unread: 0,
  add: (n) =>
    set((s) => ({
      items: [n, ...s.items].slice(0, MAX),
      unread: s.unread + 1,
    })),
  markAllRead: () =>
    set((s) => ({ items: s.items.map((i) => ({ ...i, read: true })), unread: 0 })),
  clear: () => set({ items: [], unread: 0 }),
}));
