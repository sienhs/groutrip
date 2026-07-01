import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { useNotificationStore } from '../store/notificationStore';
import { cn } from '../lib/cn';
import { timeAgo } from '../lib/notifications';
import type { ToastType } from './Toast';

const DOT: Record<ToastType, string> = {
  success: 'bg-success',
  error: 'bg-danger',
  info: 'bg-info',
  warning: 'bg-warning',
};

/**
 * 알림 벨 + 드롭다운. 헤더 actions 에 넣어 사용. 실시간 알림은 notificationStore 가 채운다.
 * 드롭다운은 portal + fixed로 띄워 상위 overflow-hidden(예: 그룹 배너)에 잘리지 않게 한다.
 */
export default function NotificationBell() {
  const navigate = useNavigate();
  const { items, unread, markRead, hydrate } = useNotificationStore();
  const [open, setOpen] = useState(false);

  // 벨은 대부분의 인증 화면 헤더에 있으므로, 마운트 시 서버에서 알림을 불러와 배지를 동기화한다.
  useEffect(() => {
    hydrate();
  }, [hydrate]);
  const btnRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ top: number; right: number }>({ top: 0, right: 0 });

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      const target = e.target as Node;
      if (btnRef.current?.contains(target) || panelRef.current?.contains(target)) return;
      setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  const toggle = () => {
    setOpen((v) => {
      const next = !v;
      if (next && btnRef.current) {
        const r = btnRef.current.getBoundingClientRect();
        setPos({ top: r.bottom + 8, right: Math.max(8, window.innerWidth - r.right) });
      }
      return next;
    });
  };

  // 알림 클릭: 읽음 처리 후 서버가 만든 딥링크로 이동.
  const openNotification = (id: number, targetPath: string) => {
    markRead(id);
    setOpen(false);
    navigate(targetPath);
  };

  return (
    <div className="relative">
      <button
        ref={btnRef}
        type="button"
        aria-label={`알림${unread > 0 ? ` ${unread}개` : ''}`}
        onClick={toggle}
        className="relative flex size-9 items-center justify-center text-foreground"
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

      {open &&
        createPortal(
          <div
            ref={panelRef}
            style={{ position: 'fixed', top: pos.top, right: pos.right }}
            className="z-[60] w-[300px] max-w-[calc(100vw-1rem)] overflow-hidden rounded-card border border-border bg-surface shadow-lg"
          >
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <span className="text-[14px] font-extrabold text-foreground">알림</span>
              <span className="text-[12px] text-muted">{items.length}건</span>
            </div>
            <div className="max-h-[360px] overflow-y-auto">
              {items.length === 0 ? (
                <p className="px-4 py-10 text-center text-[13px] text-muted">새 알림이 없어요</p>
              ) : (
                items.map((n) => (
                  <button
                    key={n.id}
                    type="button"
                    onClick={() => openNotification(n.id, n.targetPath)}
                    className={cn(
                      'flex w-full gap-3 border-b border-border px-4 py-3 text-left transition-colors hover:bg-primary/5',
                      !n.read && 'bg-primary/10',
                    )}
                  >
                    <span className={cn('mt-1.5 size-2 shrink-0 rounded-full', DOT[n.toast])} />
                    <div className="min-w-0 flex-1">
                      <p className="text-[13px] font-semibold leading-snug text-foreground">{n.message}</p>
                      <p className="mt-0.5 text-[11px] text-muted">{timeAgo(n.ts)}</p>
                    </div>
                  </button>
                ))
              )}
            </div>
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                navigate('/notifications');
              }}
              className="block w-full border-t border-border px-4 py-3 text-center text-[13px] font-bold text-primary"
            >
              전체 알림 보기
            </button>
          </div>,
          document.body,
        )}
    </div>
  );
}
