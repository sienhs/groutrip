import { NavLink, useNavigate } from 'react-router-dom';
import { cn } from '../lib/cn';
import { NAV } from './navConfig';
import { useNotificationStore } from '../store/notificationStore';
import { pathForNotification, timeAgo } from '../lib/notifications';
import type { ToastType } from './Toast';

const DOT: Record<ToastType, string> = {
  success: 'bg-success',
  error: 'bg-danger',
  info: 'bg-info',
  warning: 'bg-warning',
};

/**
 * 데스크톱(md+) 좌측 사이드바 내비게이션 + 알림 영역.
 * 모바일에서는 숨고(BottomNav/헤더 벨이 대체), md 이상에서만 표시된다.
 */
export default function SideNav() {
  const navigate = useNavigate();
  const items = useNotificationStore((s) => s.items);
  const unread = useNotificationStore((s) => s.unread);
  const markRead = useNotificationStore((s) => s.markRead);
  const recent = items.slice(0, 3);

  return (
    <aside
      aria-label="주요 메뉴"
      className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col border-r border-border bg-surface px-3 py-5 md:flex"
    >
      {/* 브랜드 */}
      <NavLink to="/" className="mb-6 flex items-center gap-2.5 px-2.5">
        <span className="flex size-8 items-center justify-center rounded-lg bg-primary">
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path d="M12 21s-7-5.2-7-10.5A7 7 0 0 1 12 3.5a7 7 0 0 1 7 7C19 15.8 12 21 12 21Z" stroke="#fff" strokeWidth="2" strokeLinejoin="round" />
            <circle cx="12" cy="10.5" r="2.2" fill="#fff" />
          </svg>
        </span>
        <span className="text-[18px] font-extrabold tracking-tight">GrouTrip <span className="text-muted">편돌즈</span></span>
      </NavLink>

      {/* 메뉴 */}
      <nav className="flex flex-col gap-1">
        {NAV.map((item) => (
          <NavLink key={item.to} to={item.to} end={item.to === '/'} className="focus-visible:outline-none">
            {({ isActive }) => (
              <span
                className={cn(
                  'flex items-center gap-3 rounded-button px-3 py-2.5 text-[15px] font-bold transition-colors',
                  isActive ? 'bg-primary/10 text-primary' : 'text-muted hover:bg-border/50',
                )}
              >
                {item.icon(isActive)}
                {item.label}
              </span>
            )}
          </NavLink>
        ))}
      </nav>

      {/* 알림 영역 */}
      <div className="mt-6 flex min-h-0 flex-1 flex-col">
        <div className="mb-2 flex items-center justify-between px-3">
          <span className="flex items-center gap-1.5 text-[12px] font-extrabold tracking-wide text-muted">
            알림
            {unread > 0 && (
              <span className="flex min-w-[18px] items-center justify-center rounded-full bg-danger px-1 text-[10px] font-extrabold leading-none text-white">
                {unread > 9 ? '9+' : unread}
              </span>
            )}
          </span>
          {items.length > 0 && (
            <button type="button" onClick={() => navigate('/notifications')} className="text-[11px] font-bold text-primary">
              전체보기
            </button>
          )}
        </div>

        {recent.length === 0 ? (
          <p className="rounded-card border border-dashed border-border px-3 py-5 text-center text-[12px] text-muted">
            새 알림이 없어요
          </p>
        ) : (
          <div className="min-h-0 flex-1 space-y-1 overflow-y-auto">
            {recent.map((n) => (
              <button
                key={n.id}
                type="button"
                onClick={() => {
                  markRead(n.id);
                  navigate(pathForNotification(n));
                }}
                className={cn(
                  'flex w-full gap-2.5 rounded-button px-3 py-2 text-left transition-colors hover:bg-border/40',
                  !n.read && 'bg-primary/5',
                )}
              >
                <span className={cn('mt-1.5 size-2 shrink-0 rounded-full', DOT[n.toast])} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[12px] font-semibold text-foreground">{n.message}</span>
                  <span className="mt-0.5 block text-[10px] text-muted">{timeAgo(n.ts)}</span>
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
    </aside>
  );
}
