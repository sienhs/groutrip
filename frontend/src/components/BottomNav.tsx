import { NavLink } from 'react-router-dom';
import { cn } from '../lib/cn';
import { NAV } from './navConfig';

/** 모바일 하단 탭 내비게이션(md 이상에서는 SideNav가 대체). 현재 라우트에 따라 활성색 표시. */
export default function BottomNav() {
  return (
    <nav
      aria-label="주요 메뉴"
      className="sticky bottom-0 z-30 flex border-t border-border bg-surface px-1.5 pb-2.5 pt-2 md:hidden"
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
                isActive ? 'text-[#C25478]' : 'text-[#ABA6B8]',
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
