import { NavLink } from 'react-router-dom';
import { cn } from '../lib/cn';
import { NAV } from './navConfig';

/**
 * 데스크톱(md+) 좌측 사이드바 내비게이션.
 * 모바일에서는 숨고(BottomNav가 대체), md 이상에서만 표시된다.
 */
export default function SideNav() {
  return (
    <aside
      aria-label="주요 메뉴"
      className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col border-r border-border bg-surface px-3 py-5 md:flex"
    >
      {/* 브랜드 */}
      <NavLink to="/" className="mb-6 flex items-center gap-2.5 px-2.5">
        <span className="flex size-8 items-center justify-center rounded-lg bg-primary">
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path d="M12 21s-7-5.2-7-10.5A7 7 0 0 1 12 3.5a7 7 0 0 1 7 7C19 15.8 12 21 12 21Z" stroke="#fff" strokeWidth="2" strokeLinejoin="round" />
            <circle cx="12" cy="10.5" r="2.2" fill="#fff" />
          </svg>
        </span>
        <span className="text-[18px] font-extrabold tracking-tight">편돌즈<span className="text-muted">.trip</span></span>
      </NavLink>

      {/* 메뉴 */}
      <nav className="flex flex-1 flex-col gap-1">
        {NAV.map((item) => (
          <NavLink key={item.to} to={item.to} end={item.to === '/'} className="focus-visible:outline-none">
            {({ isActive }) => (
              <span
                className={cn(
                  'flex items-center gap-3 rounded-button px-3 py-2.5 text-[15px] font-bold transition-colors',
                  isActive ? 'bg-[#FCF0F9] text-[#D62E97]' : 'text-muted hover:bg-border/50',
                )}
              >
                {item.icon(isActive)}
                {item.label}
              </span>
            )}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
