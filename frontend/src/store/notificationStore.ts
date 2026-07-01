import { create } from 'zustand';
import type { AppNotification } from '../types/sse';
import {
  listNotifications,
  markNotificationRead,
  markAllNotificationsRead,
} from '../api/notification';

/**
 * 알림 스토어(Zustand) — 서버(DB) 기반. 로컬스토리지에 저장하지 않으므로 다른 기기에서도 같은 알림을 본다.
 * - hydrate(): 서버에서 목록을 불러와 채운다(앱/화면 진입, 실시간 이벤트 수신 시).
 * - markRead/markAllRead: 낙관적으로 로컬을 갱신하고 서버에도 반영한다.
 * 실시간 갱신은 useGroupStream 이 이벤트 수신 시 hydrate() 를 호출해 처리한다.
 */
interface NotificationState {
  items: AppNotification[];
  unread: number;
  hydrate: () => Promise<void>;
  markRead: (id: number) => void;
  markAllRead: () => void;
}

const unreadOf = (items: AppNotification[]) => items.filter((i) => !i.read).length;

export const useNotificationStore = create<NotificationState>((set, get) => ({
  items: [],
  unread: 0,

  hydrate: async () => {
    try {
      const items = await listNotifications();
      set({ items, unread: unreadOf(items) });
    } catch {
      // 미인증/일시 오류 시 조용히 무시(다음 진입/이벤트에서 다시 시도).
    }
  },

  markRead: (id) => {
    const target = get().items.find((i) => i.id === id);
    if (!target || target.read) return;
    set((s) => {
      const items = s.items.map((i) => (i.id === id ? { ...i, read: true } : i));
      return { items, unread: unreadOf(items) };
    });
    markNotificationRead(id).catch(() => {});
  },

  markAllRead: () => {
    set((s) => ({ items: s.items.map((i) => ({ ...i, read: true })), unread: 0 }));
    markAllNotificationsRead().catch(() => {});
  },
}));
