import { useEffect, useRef, useState } from 'react';
import { useNotificationStore } from '../store/notificationStore';
import { cn } from '../lib/cn';
import type { ToastType } from './Toast';

const DOT: Record<ToastType, string> = {
  success: 'bg-success',
  error: 'bg-danger',
  info: 'bg-info',
  warning: 'bg-warning',
};

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60_000);
  if (m < 1) return '방금';
  if (m < 60) return `${m}분 전`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}시간 전`;
  return `${Math.floor(h / 24)}일 전`;
}

/** 알림 벨 + 드롭다운. 헤더 actions 에 넣어 사용. 실시간 알림은 notificationStore 가 채운다. */
export default function NotificationBell() {
  const { items, unread, markAllRead } = useNotificationStore();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  const toggle = () => {
    setOpen((v) => {
      if (!v && unread > 0) markAllRead();
      return !v;
    });
  };

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-label={`알림${unread > 0 ? ` ${unread}개` : ''}`}
        onClick={toggle}
        className="relative flex size-9 items-center justify-center text-[#5C5044]"
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
          <path d="M6 9a6 6 0 1 1 12 0c0 5 2 6 2 6H4s2-1 2-6Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
          <path d="M10 19a2 2 0 0 0 4 0" stroke="currentColor" strokeWidth="1.8" />
        </svg>
        {unread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex min-w-[18px] items-center justify-center rounded-full border-2 border-surface bg-danger px-1 text-[10px] font-extrabold leading-none text-white">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-11 z-50 w-[300px] max-w-[calc(100vw-2rem)] overflow-hidden rounded-card border border-border bg-surface shadow-lg">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <span className="text-[14px] font-extrabold">알림</span>
            <span className="text-[12px] text-muted">{items.length}건</span>
          </div>
          <div className="max-h-[360px] overflow-y-auto">
            {items.length === 0 ? (
              <p className="px-4 py-10 text-center text-[13px] text-muted">새 알림이 없어요</p>
            ) : (
              items.map((n) => (
                <div key={n.id} className={cn('flex gap-3 border-b border-[#F4ECE0] px-4 py-3', !n.read && 'bg-[#FFF7F0]')}>
                  <span className={cn('mt-1.5 size-2 shrink-0 rounded-full', DOT[n.toast])} />
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] font-semibold leading-snug text-[#3A322B]">{n.message}</p>
                    <p className="mt-0.5 text-[11px] text-muted">{timeAgo(n.ts)}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
