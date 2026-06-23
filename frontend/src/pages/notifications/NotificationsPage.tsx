import { useNavigate } from 'react-router-dom';
import AppLayout from '../../components/AppLayout';
import EmptyState from '../../components/EmptyState';
import { useNotificationStore } from '../../store/notificationStore';
import { pathForNotification, timeAgo } from '../../lib/notifications';
import { cn } from '../../lib/cn';
import type { ToastType } from '../../components/Toast';

const DOT: Record<ToastType, string> = {
  success: 'bg-success',
  error: 'bg-danger',
  info: 'bg-info',
  warning: 'bg-warning',
};

/** 알림 센터 — 전체 알림 목록. 클릭 시 해당 그룹 탭으로 딥링크. */
export default function NotificationsPage() {
  const navigate = useNavigate();
  const { items, unread, markRead, markAllRead, clear } = useNotificationStore();

  const headerActions = items.length > 0 && (
    <div className="flex items-center gap-3">
      {unread > 0 && (
        <button type="button" onClick={markAllRead} className="text-[12px] font-bold text-primary">
          모두 읽음
        </button>
      )}
      <button type="button" onClick={clear} className="text-[12px] font-bold text-muted">
        전체 삭제
      </button>
    </div>
  );

  return (
    <AppLayout title="알림" showBack headerActions={headerActions || undefined}>
      {items.length === 0 ? (
        <div className="mt-10">
          <EmptyState title="알림이 없어요" description="그룹에 새로운 활동이 생기면 여기에 표시됩니다." />
        </div>
      ) : (
        <div className="-mx-4 divide-y divide-border border-y border-border">
          {items.map((n) => (
            <button
              key={n.id}
              type="button"
              onClick={() => {
                markRead(n.id);
                navigate(pathForNotification(n));
              }}
              className={cn(
                'flex w-full gap-3 px-4 py-3.5 text-left transition-colors hover:bg-primary/5',
                !n.read && 'bg-primary/10',
              )}
            >
              <span className={cn('mt-1.5 size-2 shrink-0 rounded-full', DOT[n.toast])} />
              <div className="min-w-0 flex-1">
                <p className="text-[14px] font-semibold leading-snug text-foreground">{n.message}</p>
                <p className="mt-0.5 text-[12px] text-muted">{timeAgo(n.ts)}</p>
              </div>
            </button>
          ))}
        </div>
      )}
    </AppLayout>
  );
}
