import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/**
 * 앱 개인설정(기기 단위, localStorage 저장).
 *  - theme: 라이트/다크 테마. App에서 <html>의 .dark 클래스로 반영한다.
 *  - notificationsEnabled: 그룹 실시간 이벤트의 토스트/알림 표시 여부(useGroupStream에서 참조).
 * 서버에 저장하지 않으므로 기기마다 독립적이다.
 */
export type Theme = 'light' | 'dark';

interface SettingsState {
  theme: Theme;
  notificationsEnabled: boolean;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
  setNotificationsEnabled: (enabled: boolean) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      theme: 'light',
      notificationsEnabled: true,
      setTheme: (theme) => set({ theme }),
      toggleTheme: () => set((s) => ({ theme: s.theme === 'dark' ? 'light' : 'dark' })),
      setNotificationsEnabled: (notificationsEnabled) => set({ notificationsEnabled }),
    }),
    { name: 'app_settings' },
  ),
);
