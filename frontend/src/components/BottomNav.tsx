import { NavLink } from 'react-router-dom';
import { cn } from '../lib/cn';

interface NavItem {
  to: string;
  label: string;
  icon: (active: boolean) => React.ReactNode;
}

const iconProps = (active: boolean) => ({
  width: 24,
  height: 24,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: active ? 2.2 : 1.9,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
});

const NAV: NavItem[] = [
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
    to: '/recommend',
    label: '추천',
    icon: (a) => (
      <svg {...iconProps(a)}>
        <path d="M12 3l2.3 5.6L20 9.3l-4 4 1 5.7L12 16l-5 3 1-5.7-4-4 5.7-.7L12 3Z" />
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

/** 모바일 하단 탭 내비게이션. 현재 라우트에 따라 활성색 표시. */
export default function BottomNav() {
  return (
    <nav
      aria-label="주요 메뉴"
      className="sticky bottom-0 z-30 flex border-t border-border bg-surface px-1.5 pb-2.5 pt-2"
    >
      {NAV.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.to === '/'}
          className="flex flex-1 flex-col items-center gap-1 py-1 focus-visible:outline-none"
        >
          {({ isActive }) => (
            <span
              className={cn(
                'flex flex-col items-center gap-1',
                isActive ? 'text-[#E8742E]' : 'text-[#B0A18F]',
              )}
            >
              {item.icon(isActive)}
              <span className="text-[11px] font-bold">{item.label}</span>
            </span>
          )}
        </NavLink>
      ))}
    </nav>
  );
}
