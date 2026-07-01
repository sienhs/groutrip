import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import AppLayout from '../../components/AppLayout';
import Button from '../../components/Button';
import { useToast } from '../../components/Toast';
import { getIsAdmin, getAdminUsers, adminChangeName, adminSetBanned, adminSetBadge } from '../../api/admin';
import type { AdminUser } from '../../types/admin';

/**
 * 운영자(본인) 전용 관리 페이지 — 친구들끼리 쓰는 장난용.
 * 사용자별로 닉네임 강제 변경 · 계정 정지/해제 · 장난 배지 부여를 할 수 있다.
 * 접근 권한은 백엔드(관리자 이메일)에서 최종 검증한다.
 */
export default function AdminPage() {
  const navigate = useNavigate();
  const toast = useToast();
  const queryClient = useQueryClient();

  // 관리자가 아니면 접근 차단(백엔드가 최종 게이트지만 UX상 즉시 돌려보낸다).
  const [checked, setChecked] = useState(false);
  useEffect(() => {
    getIsAdmin()
      .then((admin) => {
        if (!admin) {
          toast.error('접근 권한이 없어요');
          navigate('/mypage', { replace: true });
        } else {
          setChecked(true);
        }
      })
      .catch(() => navigate('/mypage', { replace: true }));
  }, [navigate, toast]);

  const { data: users = [], isLoading } = useQuery({
    queryKey: ['admin', 'users'],
    queryFn: getAdminUsers,
    enabled: checked,
  });

  const refresh = () => queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });

  if (!checked) return <AppLayout title="관리자" showBack><p className="py-16 text-center text-[13px] text-muted">확인 중…</p></AppLayout>;

  return (
    <AppLayout title="관리자" showBack>
      <p className="mb-3 text-[12px] text-muted">
        전체 {users.length}명 · 닉네임 변경 · 계정 정지 · 장난 배지 (장난은 적당히 🤫)
      </p>
      {isLoading ? (
        <p className="py-16 text-center text-[13px] text-muted">불러오는 중…</p>
      ) : (
        <div className="space-y-2.5">
          {users.map((u) => (
            <AdminUserRow key={u.id} user={u} onDone={refresh} />
          ))}
        </div>
      )}
    </AppLayout>
  );
}

function AdminUserRow({ user, onDone }: { user: AdminUser; onDone: () => void }) {
  const toast = useToast();
  const [name, setName] = useState(user.name);
  const [badge, setBadge] = useState(user.badge ?? '');
  const [busy, setBusy] = useState(false);

  const run = async (fn: () => Promise<unknown>, ok: string) => {
    setBusy(true);
    try {
      await fn();
      toast.success(ok);
      onDone();
    } catch (e) {
      const message = (e as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error('실패했어요', message ?? '잠시 후 다시 시도해 주세요.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="rounded-card border border-border bg-surface p-3">
      <div className="mb-2 flex items-center gap-2">
        <span className="truncate text-[14px] font-bold text-foreground">{user.name}</span>
        {user.badge && (
          <span className="shrink-0 rounded-full bg-[#FFF0E6] px-2 py-0.5 text-[11px] font-bold text-[#E07830]">
            {user.badge}
          </span>
        )}
        {user.banned && (
          <span className="shrink-0 rounded-full bg-[#FEE2E2] px-2 py-0.5 text-[11px] font-bold text-danger">정지됨</span>
        )}
      </div>
      <p className="mb-2.5 truncate text-[11px] text-muted">{user.email}</p>

      {/* 닉네임 변경 */}
      <div className="mb-2 flex items-center gap-2">
        <input
          value={name}
          maxLength={20}
          onChange={(e) => setName(e.target.value)}
          placeholder="닉네임"
          className="min-w-0 flex-1 rounded-button border border-border bg-background px-2.5 py-1.5 text-[13px] outline-none focus:border-primary"
        />
        <Button
          size="sm"
          disabled={busy || !name.trim() || name.trim() === user.name}
          onClick={() => run(() => adminChangeName(user.id, name.trim()), '닉네임을 변경했어요')}
        >
          이름
        </Button>
      </div>

      {/* 장난 배지 */}
      <div className="mb-2 flex items-center gap-2">
        <input
          value={badge}
          maxLength={30}
          onChange={(e) => setBadge(e.target.value)}
          placeholder="장난 배지/칭호 (예: 밥차톨)"
          className="min-w-0 flex-1 rounded-button border border-border bg-background px-2.5 py-1.5 text-[13px] outline-none focus:border-primary"
        />
        <Button
          size="sm"
          variant="secondary"
          disabled={busy || badge === (user.badge ?? '')}
          onClick={() => run(() => adminSetBadge(user.id, badge.trim()), '배지를 적용했어요')}
        >
          배지
        </Button>
      </div>

      {/* 계정 정지/해제 */}
      <Button
        size="sm"
        variant={user.banned ? 'secondary' : 'danger'}
        fullWidth
        disabled={busy}
        onClick={() =>
          run(() => adminSetBanned(user.id, !user.banned), user.banned ? '정지를 해제했어요' : '계정을 정지했어요')
        }
      >
        {user.banned ? '정지 해제' : '계정 정지'}
      </Button>
    </div>
  );
}
