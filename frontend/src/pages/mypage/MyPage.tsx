import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AppLayout from '../../components/AppLayout';
import Avatar from '../../components/Avatar';
import Button from '../../components/Button';
import Modal from '../../components/Modal';
import { useToast } from '../../components/Toast';
import { deleteAccount, getMyStats, updateMyName, uploadMyAvatar, userAvatarUrl, type MyStats } from '../../api/user';
import { logout } from '../../api/auth';
import useAuthStore from '../../store/authStore';
import { useSettingsStore } from '../../store/settingsStore';
import { cn } from '../../lib/cn';

/** 통계 기반 도전과제(배지). earned 가 true면 달성, 아니면 hint 로 조건 안내. */
const BADGES: { emoji: string; label: string; hint: string; earned: (s: MyStats) => boolean }[] = [
  { emoji: '🌱', label: '여행 입문', hint: '그룹 참여', earned: (s) => s.totalTrips >= 1 },
  { emoji: '🧳', label: '첫 완주', hint: '여행 1회 완료', earned: (s) => s.completedTrips >= 1 },
  { emoji: '🗺️', label: '지역 탐험가', hint: '3개 지역', earned: (s) => s.visitedRegions >= 3 },
  { emoji: '📌', label: '장소 수집가', hint: '10곳 담기', earned: (s) => s.bookmarkCount >= 10 },
  { emoji: '📅', label: '장기 여행자', hint: '누적 7일', earned: (s) => s.totalTripDays >= 7 },
  { emoji: '🔥', label: '단골 여행러', hint: '5회 완료', earned: (s) => s.completedTrips >= 5 },
];

/**
 * 마이페이지 — 프로필(이름 변경), 여행 통계, 페르소나, 앱 설정(테마/알림), 계정 탈퇴.
 * 인증은 SNS 전용이라 비밀번호 변경은 없고, 탈퇴는 확인 다이얼로그로만 본인 확인한다.
 * 앱 설정은 기기 단위(localStorage)로만 저장된다.
 */
export default function MyPage() {
  const navigate = useNavigate();
  const toast = useToast();
  const user = useAuthStore((s) => s.user);
  const updateUserName = useAuthStore((s) => s.updateUserName);
  const clearAuth = useAuthStore((s) => s.clearAuth);

  // 앱 개인설정(기기 단위)
  const theme = useSettingsStore((s) => s.theme);
  const toggleTheme = useSettingsStore((s) => s.toggleTheme);
  const notificationsEnabled = useSettingsStore((s) => s.notificationsEnabled);
  const setNotificationsEnabled = useSettingsStore((s) => s.setNotificationsEnabled);

  const [delOpen, setDelOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const avatarRef = useRef<HTMLInputElement>(null);
  const [avatarVersion, setAvatarVersion] = useState(0);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [photoOpen, setPhotoOpen] = useState(false);

  // 이름 인라인 편집
  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState('');
  const [savingName, setSavingName] = useState(false);

  // 여행 통계
  const [stats, setStats] = useState<MyStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [statsError, setStatsError] = useState(false);

  // 재시도 버튼용(이벤트 핸들러에서 호출 — 로딩 상태를 즉시 표시).
  const loadStats = useCallback(() => {
    setStatsLoading(true);
    setStatsError(false);
    getMyStats()
      .then(setStats)
      .catch(() => setStatsError(true))
      .finally(() => setStatsLoading(false));
  }, []);

  // 최초 진입 로드: effect 본문에서 동기 setState를 피하고 async 콜백에서만 상태를 바꾼다.
  useEffect(() => {
    let active = true;
    getMyStats()
      .then((s) => { if (active) setStats(s); })
      .catch(() => { if (active) setStatsError(true); })
      .finally(() => { if (active) setStatsLoading(false); });
    return () => { active = false; };
  }, []);

  // 참여 그룹·보관·지출이 모두 0이면 "아직 데이터 없음"으로 본다.
  const statsEmpty =
    stats != null &&
    stats.totalTrips === 0 &&
    stats.bookmarkCount === 0 &&
    stats.totalSpending === 0;

  const onPickAvatar = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setAvatarUploading(true);
    try {
      await uploadMyAvatar(file);
      setAvatarVersion((v) => v + 1); // 캐시 버스트
      toast.success('프로필 사진을 등록했어요');
    } catch (err) {
      const message = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error('업로드에 실패했어요', message ?? '5MB 이하 이미지인지 확인해 주세요.');
    } finally {
      setAvatarUploading(false);
    }
  };

  const startEditName = () => {
    setNameDraft(user?.name ?? '');
    setEditingName(true);
  };

  const saveName = async () => {
    const next = nameDraft.trim();
    if (!next || next === user?.name) {
      setEditingName(false);
      return;
    }
    if (next.length > 20) {
      toast.error('이름이 너무 길어요', '20자 이하로 입력해 주세요.');
      return;
    }
    setSavingName(true);
    try {
      const saved = await updateMyName(next);
      updateUserName(saved);
      setEditingName(false);
      toast.success('이름을 변경했어요');
    } catch (err) {
      const message = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error('이름 변경에 실패했어요', message ?? '잠시 후 다시 시도해 주세요.');
    } finally {
      setSavingName(false);
    }
  };

  const handleLogout = async () => {
    // 서버 Refresh Token/쿠키 정리. 실패해도 클라이언트 세션은 비운다(FR-AUTH-04).
    try {
      await logout();
    } catch {
      /* 이미 만료/무효일 수 있음 — 무시 */
    }
    clearAuth();
    navigate('/login', { replace: true });
  };

  const confirmDelete = async () => {
    setDeleting(true);
    try {
      await deleteAccount();
      toast.info('탈퇴 처리되었습니다');
      clearAuth();
      navigate('/login', { replace: true });
    } catch (e: unknown) {
      // Owner 인 그룹이 있으면 400
      const status = (e as { response?: { status?: number } })?.response?.status;
      if (status === 400) {
        toast.error('탈퇴할 수 없어요', '소유한 그룹의 위임 또는 해체를 먼저 진행해 주세요.');
      } else {
        toast.error('탈퇴에 실패했어요', '잠시 후 다시 시도해 주세요.');
      }
    } finally {
      setDeleting(false);
    }
  };

  return (
    <AppLayout title="마이페이지">
      {/* 프로필 */}
      <div className="flex items-center gap-3.5">
        <div className="relative">
          <button
            type="button"
            aria-label="프로필 사진 크게 보기"
            onClick={() => setPhotoOpen(true)}
            className="rounded-full"
          >
            <Avatar name={user?.name ?? '여행자'} userId={user?.id} version={avatarVersion} size="lg" className="size-[60px] text-2xl" />
          </button>
          <button
            type="button"
            aria-label="프로필 사진 변경"
            disabled={avatarUploading}
            onClick={() => avatarRef.current?.click()}
            className="absolute -bottom-0.5 -right-0.5 flex size-6 items-center justify-center rounded-full border-2 border-background bg-primary text-white shadow disabled:opacity-60"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path d="M4 8h3l1.5-2h7L17 8h3v11H4V8Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
              <circle cx="12" cy="13" r="3" stroke="currentColor" strokeWidth="1.8" />
            </svg>
          </button>
          <input ref={avatarRef} type="file" accept="image/*" className="hidden" onChange={onPickAvatar} />
        </div>
        <div className="min-w-0 flex-1">
          {editingName ? (
            <div className="flex items-center gap-2">
              <input
                autoFocus
                value={nameDraft}
                maxLength={20}
                onChange={(e) => setNameDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') saveName();
                  if (e.key === 'Escape') setEditingName(false);
                }}
                className="min-w-0 flex-1 rounded-button border border-border bg-surface px-2.5 py-1.5 text-[16px] font-bold outline-none focus:border-primary"
                placeholder="이름"
              />
              <Button size="sm" variant="primary" loading={savingName} onClick={saveName}>저장</Button>
              <Button size="sm" variant="ghost" className="border border-border" disabled={savingName} onClick={() => setEditingName(false)}>취소</Button>
            </div>
          ) : (
            <div className="flex items-center gap-1.5">
              <span className="truncate text-[19px] font-extrabold">{user?.name ?? '여행자'}</span>
              <button
                type="button"
                aria-label="이름 변경"
                onClick={startEditName}
                className="flex size-6 shrink-0 items-center justify-center rounded-full text-muted transition-colors hover:bg-border/60"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
                  <path d="M4 20h4l10-10-4-4L4 16v4Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
                  <path d="M13.5 6.5l4 4" stroke="currentColor" strokeWidth="1.8" />
                </svg>
              </button>
            </div>
          )}
          <p className="mt-0.5 text-[13px] text-muted">{user?.email ?? '-'}</p>
        </div>
      </div>

      {/* 여행 통계 */}
      <p className="mb-2 mt-6 text-[12px] font-extrabold tracking-wide text-muted">내 여행 통계</p>
      {statsLoading ? (
        <div className="h-[120px] animate-pulse rounded-card border border-border bg-surface" />
      ) : statsError ? (
        <div className="flex flex-col items-center gap-2 rounded-card border border-border bg-surface px-4 py-6 text-center">
          <p className="text-[13px] text-muted">통계를 불러오지 못했어요.</p>
          <Button size="sm" variant="secondary" onClick={loadStats}>다시 시도</Button>
        </div>
      ) : statsEmpty ? (
        <div className="rounded-card border border-border bg-surface px-4 py-6 text-center">
          <p className="text-[13px] text-muted">아직 여행 데이터가 없어요.</p>
          <p className="mt-0.5 text-[12px] text-muted">그룹을 만들어 첫 여행을 시작해 보세요.</p>
        </div>
      ) : stats ? (
        <div className="space-y-2">
          <div className="grid grid-cols-3 gap-2">
            <StatItem value={`${stats.inProgressTrips}`} label="진행 중" />
            <StatItem value={`${stats.upcomingTrips}`} label="예정" />
            <StatItem value={`${stats.completedTrips}`} label="완료" />
          </div>
          <div className="grid grid-cols-3 gap-2">
            <StatItem value={`${stats.totalTripDays}일`} label="누적 여행일" />
            <StatItem value={`${stats.visitedRegions}`} label="방문 지역" />
            <StatItem value={`${stats.bookmarkCount}`} label="담은 장소" />
          </div>
          <div className="rounded-card border border-border bg-surface px-4 py-3.5">
            <div className="flex items-center justify-between">
              <span className="text-[13px] font-semibold text-muted">내 결제 총액</span>
              <span className="text-[18px] font-extrabold text-primary">{stats.totalSpending.toLocaleString('ko-KR')}원</span>
            </div>
          </div>
        </div>
      ) : null}

      {/* 도전과제(배지) — 통계 기반. 통계가 정상 로드됐을 때만 노출 */}
      {!statsLoading && !statsError && stats && (
        <>
          <p className="mb-2 mt-6 text-[12px] font-extrabold tracking-wide text-muted">도전과제</p>
          <div className="grid grid-cols-3 gap-2">
            {BADGES.map((b) => {
              const earned = b.earned(stats);
              return (
                <div
                  key={b.label}
                  className={cn(
                    'flex flex-col items-center gap-1 rounded-card border px-2 py-3 text-center',
                    earned ? 'border-border bg-surface' : 'border-dashed border-border bg-surface opacity-45 grayscale',
                  )}
                >
                  <span className="text-[24px]">{b.emoji}</span>
                  <span className="text-[11px] font-extrabold text-foreground">{b.label}</span>
                  <span className="text-[10px] leading-tight text-muted">{earned ? '달성!' : b.hint}</span>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* 페르소나 */}
      <button type="button" onClick={() => navigate('/survey/result')}
        className="mt-4 flex w-full items-center gap-2.5 rounded-card border border-border bg-surface px-3.5 py-3 text-left">
        <span className="text-[22px]">🍜</span>
        <div className="flex-1">
          <div className="text-[14px] font-extrabold">내 여행 페르소나</div>
          <div className="text-[12px] text-muted">설문 결과 보기</div>
        </div>
        <span className="text-[12px] font-bold text-[#E8742E]">결과 보기 ›</span>
      </button>

      {/* 앱 설정 (기기 단위) */}
      <p className="mb-2 mt-6 text-[12px] font-extrabold tracking-wide text-muted">앱 설정</p>
      <div className="overflow-hidden rounded-card border border-border bg-surface">
        <ToggleRow label="다크 모드" on={theme === 'dark'} onChange={toggleTheme} border />
        <ToggleRow label="알림 표시" on={notificationsEnabled} onChange={() => setNotificationsEnabled(!notificationsEnabled)} />
      </div>

      {/* 메뉴 */}
      <div className="mt-3.5 overflow-hidden rounded-card border border-border bg-surface">
        <MenuRow label="설문 다시하기" onClick={() => navigate('/survey')} border />
        <MenuRow label="로그아웃" onClick={handleLogout} />
      </div>

      {/* 위험 구역 */}
      <p className="mb-2 mt-6 text-[12px] font-extrabold tracking-wide text-[#C9AFA0]">위험 구역</p>
      <button type="button" onClick={() => setDelOpen(true)}
        className="w-full rounded-card border border-[#FECACA] bg-surface px-4 py-3.5 text-left text-[15px] font-bold text-danger transition-colors hover:bg-[#FEF2F2]">
        계정 탈퇴
      </button>

      {/* 프로필 사진 크게 보기(라이트박스). 등록된 사진이 없으면(로드 실패) 닫는다. */}
      {photoOpen && user?.id != null && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-6"
          onClick={() => setPhotoOpen(false)}
        >
          <img
            src={userAvatarUrl(user.id, avatarVersion)}
            alt={user?.name ?? '프로필 사진'}
            className="max-h-[80vh] max-w-full rounded-2xl object-contain"
            onError={() => setPhotoOpen(false)}
          />
        </div>
      )}

      <Modal
        open={delOpen}
        onClose={() => setDelOpen(false)}
        title="정말 탈퇴하시겠어요?"
        description="계정을 삭제하면 참여 중인 그룹과 일정·정산 기록이 모두 사라지며 복구할 수 없습니다."
        dismissable={!deleting}
        icon={
          <div className="flex size-11 items-center justify-center rounded-xl bg-[#FEE2E2]">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path d="M12 3 2 20h20L12 3Z" stroke="#EF4444" strokeWidth="2" strokeLinejoin="round" />
              <path d="M12 10v4M12 17v.5" stroke="#EF4444" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </div>
        }
        footer={
          <>
            <Button variant="ghost" fullWidth className="border border-border" disabled={deleting} onClick={() => setDelOpen(false)}>취소</Button>
            <Button variant="danger" fullWidth loading={deleting} onClick={confirmDelete}>탈퇴하기</Button>
          </>
        }
      />
    </AppLayout>
  );
}

function StatItem({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-card border border-border bg-surface px-2 py-3 text-center">
      <div className="text-[20px] font-extrabold text-primary">{value}</div>
      <div className="mt-0.5 text-[11px] text-muted">{label}</div>
    </div>
  );
}

function MenuRow({ label, onClick, border }: { label: string; onClick: () => void; border?: boolean }) {
  return (
    <button type="button" onClick={onClick}
      className={cn('flex w-full items-center px-3.5 py-[15px] text-left text-[15px] font-semibold', border && 'border-b border-[#F4ECE0]')}>
      <span className="flex-1">{label}</span>
      <span className="text-[#C0AE9B]">›</span>
    </button>
  );
}

function ToggleRow({ label, on, onChange, border }: { label: string; on: boolean; onChange: () => void; border?: boolean }) {
  return (
    <div className={cn('flex w-full items-center px-3.5 py-[13px]', border && 'border-b border-[#F4ECE0]')}>
      <span className="flex-1 text-[15px] font-semibold">{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={on}
        aria-label={label}
        onClick={(e) => {
          e.preventDefault();
          onChange();
        }}
        className={cn(
          'inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors',
          on ? 'bg-primary' : 'bg-[#D9CFC2]',
        )}
      >
        <span
          className={cn(
            'inline-block size-5 rounded-full bg-white shadow transition-transform',
            on ? 'translate-x-[22px]' : 'translate-x-0.5',
          )}
        />
      </button>
    </div>
  );
}
