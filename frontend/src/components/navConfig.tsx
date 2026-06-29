import type { ReactNode } from 'react';

/** 주요 내비게이션 항목 — 모바일 하단탭(BottomNav)과 데스크톱 사이드바(SideNav)가 공유한다. */
export interface NavItem {
  to: string;
  label: string;
  icon: (active: boolean) => ReactNode;
}

const iconProps = (active: boolean) => ({
  width: 24,
  height: 24,
  viewBox: '0 0 24 24',
  fill: 'none' as const,
  stroke: 'currentColor',
  strokeWidth: active ? 2.2 : 1.9,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
});

export const NAV: NavItem[] = [
  {
    to: '/',
    label: '홈',
    icon: (a) => (
      <svg {...iconProps(a)}>
        <path d="M4 11.5 12 5l8 6.5" />
        <path d="M6 10v9h12v-9" />
      </svg>
    ),
  },
  {
    to: '/groups',
    label: '그룹',
    icon: (a) => (
      <svg {...iconProps(a)}>
        <circle cx="8.5" cy="9" r="2.6" />
        <circle cx="16" cy="10" r="2.1" />
        <path d="M3.5 19c0-2.7 2.2-4.3 5-4.3s5 1.6 5 4.3M14.5 19c0-2 1-3.4 3-3.4s3 1.4 3 3.4" />
      </svg>
    ),
  },
  {
    to: '/chat',
    label: '채팅',
    icon: (a) => (
      <svg {...iconProps(a)}>
        <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5Z" />
      </svg>
    ),
  },
  {
    to: '/mypage',
    label: '마이',
    icon: (a) => (
      <svg {...iconProps(a)}>
        <circle cx="12" cy="8.5" r="3.3" />
        <path d="M5 19.5c0-3.3 3.1-5.3 7-5.3s7 2 7 5.3" />
      </svg>
    ),
  },
];
