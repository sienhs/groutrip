import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { AppNotification } from '../types/sse';

/**
 * 실시간 알림 스토어(Zustand). useGroupStream 이 push, NotificationBell 이 소비.
 * 최근 50개를 localStorage에 영속 저장(새로고침해도 유지). 읽음 상태도 함께 저장한다.
 */
interface NotificationState {
  items: AppNotification[];
  unread: number;
  add: (n: AppNotification) => void;
  markRead: (id: string) => void;
  markAllRead: () => void;
  clear: () => void;
}

const MAX = 50;

export const useNotificationStore = create<NotificationState>()(
  persist(
    (set) => ({
      items: [],
      unread: 0,
      add: (n) =>
        set((s) => {
          // 같은 id(이벤트 타입+ts+actor)면 중복 추가 방지(SSE 재연결 시 재수신 대비).
          if (s.items.some((i) => i.id === n.id)) return s;
          return {
            items: [n, ...s.items].slice(0, MAX),
            unread: s.unread + 1,
          };
        }),
      markRead: (id) =>
        set((s) => {
          const target = s.items.find((i) => i.id === id);
          if (!target || target.read) return s;
          return {
            items: s.items.map((i) => (i.id === id ? { ...i, read: true } : i)),
            unread: Math.max(0, s.unread - 1),
          };
        }),
      markAllRead: () =>
        set((s) => ({ items: s.items.map((i) => ({ ...i, read: true })), unread: 0 })),
      clear: () => set({ items: [], unread: 0 }),
    }),
    { name: 'app_notifications' },
  ),
);
