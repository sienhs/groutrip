import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AppLayout from '../../components/AppLayout';
import Card from '../../components/Card';
import Button from '../../components/Button';
import EmptyState from '../../components/EmptyState';
import { SkeletonCard } from '../../components/Skeleton';
import NotificationBell from '../../components/NotificationBell';
import { getHome } from '../../api/home';
import GroupCover from '../group/GroupCover';
import { cn } from '../../lib/cn';
import type { HomeResponse, HomeGroupSummary } from '../../types/home';

/**
 * 홈 — GET /api/home (greetingName + 진행/예정/완료 + 알림 배지).
 * 상태 분류·인사말·미정산/투표 대기 수를 백엔드가 제공.
 */
export default function HomePage() {
  const navigate = useNavigate();
  const [home, setHome] = useState<HomeResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        setHome(await getHome());
      } catch {
        setError(true);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

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
            <span className="rounded-full bg-[#FFF1E6] px-3 py-1.5 text-[12px] font-bold text-[#E8742E]">
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
              <div className="space-y-3">
                {home.inProgress.map((g) => <OngoingCard key={g.id} g={g} onClick={() => navigate(`/groups/${g.id}`)} />)}
              </div>
            </section>
          )}
          {home.upcoming.length > 0 && (
            <section>
              <SectionTitle>예정된 여행</SectionTitle>
              <div className="space-y-3">
                {home.upcoming.map((g) => <UpcomingCard key={g.id} g={g} onClick={() => navigate(`/groups/${g.id}`)} />)}
              </div>
            </section>
          )}
          {home.completed.length > 0 && (
            <section>
              <SectionTitle>완료된 여행</SectionTitle>
              <div className="space-y-2.5">
                {home.completed.map((g) => <CompletedRow key={g.id} g={g} onClick={() => navigate(`/groups/${g.id}`)} />)}
              </div>
            </section>
          )}
        </div>
      )}
    </AppLayout>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="mb-2.5 text-[13px] font-extrabold tracking-wide text-[#BCA48C]">{children}</h2>;
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
    label: '새 그룹', to: '/groups/new', bg: 'bg-[#FFE3CC]', fg: 'text-[#E8742E]',
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
          <span className="text-[11px] font-bold text-[#5C5044]">{a.label}</span>
        </button>
      ))}
    </div>
  );
}

function OngoingCard({ g, onClick }: { g: HomeGroupSummary; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick}
      className="block w-full text-left text-white shadow-md transition-transform active:scale-[.99]">
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
        <path d="M9 6l6 6-6 6" stroke="#C0AE9B" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
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
      <span className="flex items-center gap-1 text-[12px] font-bold text-[#E8742E]">
        회고 보기
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden><path d="M9 6l6 6-6 6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
      </span>
    </Card>
  );
}
