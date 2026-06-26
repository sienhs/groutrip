import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import AppLayout from '../../components/AppLayout';
import Card from '../../components/Card';
import Button from '../../components/Button';
import EmptyState from '../../components/EmptyState';
import { SkeletonCard } from '../../components/Skeleton';
import NotificationBell from '../../components/NotificationBell';
import { getHome } from '../../api/home';
import { getMyPayout } from '../../api/user';
import { appQueryKeys } from '../../queryKeys/appQueryKeys';
import GroupCover from '../group/GroupCover';
import { cn } from '../../lib/cn';
import type { HomeGroupSummary } from '../../types/home';

/**
 * 홈 — GET /api/home (greetingName + 진행/예정/완료 + 알림 배지).
 * 상태 분류·인사말·미정산/투표 대기 수를 백엔드가 제공.
 */
export default function HomePage() {
  const navigate = useNavigate();
  const { data: home, isLoading: loading, isError: error } = useQuery({
    queryKey: appQueryKeys.home(),
    queryFn: getHome,
  });

  // 정산 받을 수단(링크/계좌) 미등록 여부 — 링크·계좌 둘 다 비어 있으면 설정 유도 배너를 띄운다.
  // 토스/카카오페이 링크라도 등록돼 있으면 배너는 뜨지 않는다.
  const { data: payout } = useQuery({ queryKey: appQueryKeys.myPayout(), queryFn: getMyPayout });
  const needsPayout = !!payout && !payout.payoutLink && !payout.payoutAccount;
  const [payoutDismissed, setPayoutDismissed] = useState(false);

  const isEmpty =
    home && home.inProgress.length === 0 && home.upcoming.length === 0 && home.completed.length === 0;

  return (
    <AppLayout headerActions={<NotificationBell />}>
      <p className="text-[13px] text-muted">안녕하세요,</p>
      <h1 className="mt-0.5 text-[21px] font-extrabold tracking-tight">{home?.greetingName ?? '여행자'}님 ✈️</h1>

      {/* 알림 배지 */}
      {home && (home.notification.unsettledAmount > 0 || home.notification.pendingVoteCount > 0) && (
        <div className="mt-3 flex gap-2">
          {home.notification.unsettledAmount > 0 && (
            <span className="rounded-full bg-[#FCF0F9] px-3 py-1.5 text-[12px] font-bold text-[#C25478]">
              미정산 ₩{home.notification.unsettledAmount.toLocaleString('ko-KR')}
            </span>
          )}
          {home.notification.pendingVoteCount > 0 && (
            <span className="rounded-full bg-[#DBEAFE] px-3 py-1.5 text-[12px] font-bold text-[#1D4ED8]">
              투표 대기 {home.notification.pendingVoteCount}
            </span>
          )}
        </div>
      )}

      {/* 정산 받기 설정 유도 — 링크·계좌 미등록자에게만 노출(바로가기 제공) */}
      {needsPayout && !payoutDismissed && (
        <PayoutNudge
          onGo={() => navigate('/mypage?settle=1')}
          onDismiss={() => setPayoutDismissed(true)}
        />
      )}

      {/* 빠른 시작 — 주요 기능 바로가기 */}
      <QuickActions navigate={navigate} />

      {loading && <div className="mt-5 space-y-3"><SkeletonCard /><SkeletonCard /></div>}

      {!loading && error && (
        <div className="mt-8">
          <EmptyState title="홈을 불러오지 못했어요" description="네트워크 상태를 확인하고 다시 시도해 주세요."
            action={<Button variant="secondary" onClick={() => window.location.reload()}>새로고침</Button>} />
        </div>
      )}

      {!loading && !error && isEmpty && (
        <div className="mt-8">
          <EmptyState title="아직 그룹이 없어요" description="첫 여행 그룹을 만들고 친구들을 초대해 보세요."
            action={<Button onClick={() => navigate('/groups/new')}>그룹 만들기</Button>} />
        </div>
      )}

      {!loading && !error && home && !isEmpty && (
        <div className="mt-5 space-y-7">
          {home.inProgress.length > 0 && (
            <section>
              <SectionTitle>진행 중인 여행</SectionTitle>
              <div className="grid gap-3 md:grid-cols-2">
                {home.inProgress.map((g) => <OngoingCard key={g.id} g={g} onClick={() => navigate(`/groups/${g.id}`)} />)}
              </div>
            </section>
          )}
          {home.upcoming.length > 0 && (
            <section>
              <SectionTitle>예정된 여행</SectionTitle>
              <div className="grid gap-3 md:grid-cols-2">
                {home.upcoming.map((g) => <UpcomingCard key={g.id} g={g} onClick={() => navigate(`/groups/${g.id}`)} />)}
              </div>
            </section>
          )}
          {home.completed.length > 0 && (
            <section>
              <SectionTitle>완료된 여행</SectionTitle>
              <div className="grid gap-2.5 md:grid-cols-2 xl:grid-cols-3">
                {home.completed.map((g) => <CompletedRow key={g.id} g={g} onClick={() => navigate(`/groups/${g.id}/recap`)} />)}
              </div>
            </section>
          )}
        </div>
      )}
    </AppLayout>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="mb-2.5 text-[13px] font-extrabold tracking-wide text-[#ABA6B8]">{children}</h2>;
}

interface QuickAction {
  label: string;
  to: string;
  bg: string;
  fg: string;
  icon: React.ReactNode;
}

const QUICK_ACTIONS: QuickAction[] = [
  {
    label: '새 그룹', to: '/groups/new', bg: 'bg-[#FFE9F6]', fg: 'text-[#C25478]',
    icon: <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />,
  },
  {
    label: '내 그룹', to: '/groups', bg: 'bg-[#E5F0FF]', fg: 'text-[#3182F6]',
    icon: <path d="M4 7h16M4 12h16M4 17h10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />,
  },
  {
    label: '여행 추천', to: '/recommend', bg: 'bg-[#E9F8EE]', fg: 'text-[#22A964]',
    icon: <path d="M12 3l2.2 5.8L20 9l-4.6 3.7L17 19l-5-3.4L7 19l1.6-6.3L4 9l5.8-.2L12 3Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />,
  },
  {
    label: '내 성향', to: '/survey/result', bg: 'bg-[#F1E9FF]', fg: 'text-[#7C3AED]',
    icon: <path d="M5 19V11M10 19V5M15 19v-6M20 19v-9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />,
  },
];

function QuickActions({ navigate }: { navigate: (to: string) => void }) {
  return (
    <div className="mt-4 grid grid-cols-4 gap-2">
      {QUICK_ACTIONS.map((a) => (
        <button
          key={a.label}
          type="button"
          onClick={() => navigate(a.to)}
          className="flex flex-col items-center gap-1.5 rounded-card border border-border bg-surface py-3 transition-transform active:scale-95"
        >
          <span className={cn('flex size-10 items-center justify-center rounded-[12px]', a.bg, a.fg)}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>{a.icon}</svg>
          </span>
          <span className="text-[11px] font-bold text-muted">{a.label}</span>
        </button>
      ))}
    </div>
  );
}

/** 정산 받을 수단(링크·계좌) 미등록 안내 배너. 마이페이지 정산 설정으로 바로 이동. */
function PayoutNudge({ onGo, onDismiss }: { onGo: () => void; onDismiss: () => void }) {
  return (
    <div className="mt-4 flex items-start gap-3 rounded-card border border-border bg-surface p-3.5 shadow-sm">
      <span className="flex size-9 flex-none items-center justify-center rounded-[12px] bg-[#E0F6FD] text-accent">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
          <rect x="3" y="6" width="18" height="12" rx="2.5" stroke="currentColor" strokeWidth="2" />
          <path d="M3 10h18" stroke="currentColor" strokeWidth="2" />
        </svg>
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[13px] font-extrabold">정산 받을 수단을 등록해 주세요</p>
        <p className="mt-0.5 text-[12px] leading-snug text-muted">
          토스·카카오페이 링크나 계좌를 등록하면 친구들이 바로 송금할 수 있어요.
        </p>
        <button
          type="button"
          onClick={onGo}
          className="mt-2 inline-flex items-center gap-0.5 rounded-button bg-primary px-3 py-1.5 text-[12px] font-bold text-primary-foreground transition-colors hover:bg-primary-hover"
        >
          설정하러 가기
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden><path d="M9 6l6 6-6 6" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </button>
      </div>
      <button
        type="button"
        aria-label="닫기"
        onClick={onDismiss}
        className="-mr-1 -mt-1 flex size-7 flex-none items-center justify-center rounded-full text-muted transition-colors hover:bg-border/60"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
      </button>
    </div>
  );
}

function OngoingCard({ g, onClick }: { g: HomeGroupSummary; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick}
      className="block w-full overflow-hidden rounded-2xl text-left text-white shadow-md transition-transform active:scale-[.99]">
      <GroupCover groupId={g.id} coverImageKey={g.coverImageKey} className="rounded-2xl p-[18px]">
        {g.coverImageKey === 'CUSTOM' && <span className="absolute inset-0 bg-black/25" aria-hidden />}
        <span className="relative rounded-full bg-white/25 px-2.5 py-1 text-[11px] font-extrabold">{g.day}</span>
        <div className="relative mt-2.5 text-[20px] font-extrabold tracking-tight drop-shadow">{g.title}</div>
        <div className="relative mt-0.5 text-[13px] opacity-90 drop-shadow">{g.destination} · {g.memberCount}명</div>
      </GroupCover>
    </button>
  );
}

function UpcomingCard({ g, onClick }: { g: HomeGroupSummary; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-3 rounded-2xl border border-border bg-surface p-3.5 text-left shadow-sm transition-transform active:scale-[.99]"
    >
      <GroupCover groupId={g.id} coverImageKey={g.coverImageKey} className="flex size-12 flex-none items-end justify-start rounded-[12px] p-1.5">
        <span className="relative rounded-full bg-white/30 px-1.5 py-0.5 text-[9px] font-extrabold text-white">{g.day}</span>
      </GroupCover>
      <div className="min-w-0 flex-1">
        <div className="truncate text-[15px] font-extrabold">{g.title}</div>
        <div className="text-[12px] text-muted">{g.destination} · {g.memberCount}명</div>
      </div>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
        <path d="M9 6l6 6-6 6" stroke="#B6B1C4" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </button>
  );
}

function CompletedRow({ g, onClick }: { g: HomeGroupSummary; onClick: () => void }) {
  return (
    <Card padding="sm" interactive onClick={onClick} className="flex items-center gap-3">
      <GroupCover groupId={g.id} coverImageKey={g.coverImageKey} className="size-11 flex-none rounded-[10px]" />
      <div className="min-w-0 flex-1">
        <div className="truncate text-[14px] font-extrabold">{g.title}</div>
        <div className="text-[12px] text-muted">{g.destination} · {g.memberCount}명</div>
      </div>
      <span className="flex items-center gap-1 text-[12px] font-bold text-[#C25478]">
        회고 보기
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden><path d="M9 6l6 6-6 6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
      </span>
    </Card>
  );
}
