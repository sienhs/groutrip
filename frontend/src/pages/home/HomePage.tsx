import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AppLayout from '../../components/AppLayout';
import Card from '../../components/Card';
import Button from '../../components/Button';
import EmptyState from '../../components/EmptyState';
import { SkeletonCard } from '../../components/Skeleton';
import NotificationBell from '../../components/NotificationBell';
import { getHome } from '../../api/home';
import { gradientForKey } from '../group/groupUi';
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
              <div className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-1">
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

function OngoingCard({ g, onClick }: { g: HomeGroupSummary; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick}
      className={cn('block w-full rounded-2xl p-[18px] text-left text-white shadow-md transition-transform active:scale-[.99]', gradientForKey(g.coverImageKey))}>
      <span className="rounded-full bg-white/25 px-2.5 py-1 text-[11px] font-extrabold">{g.day}</span>
      <div className="mt-2.5 text-[20px] font-extrabold tracking-tight">{g.title}</div>
      <div className="mt-0.5 text-[13px] opacity-90">{g.destination} · {g.memberCount}명</div>
    </button>
  );
}

function UpcomingCard({ g, onClick }: { g: HomeGroupSummary; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="w-[150px] flex-none overflow-hidden rounded-2xl border border-border bg-surface text-left shadow-sm">
      <div className={cn('h-16', gradientForKey(g.coverImageKey))} />
      <div className="p-3">
        <span className="inline-block rounded-full bg-[#FFF1E6] px-2 py-0.5 text-[11px] font-extrabold text-[#E8742E]">{g.day}</span>
        <div className="mt-1.5 truncate text-[14px] font-extrabold">{g.title}</div>
        <div className="text-[12px] text-muted">{g.destination} · {g.memberCount}명</div>
      </div>
    </button>
  );
}

function CompletedRow({ g, onClick }: { g: HomeGroupSummary; onClick: () => void }) {
  return (
    <Card padding="sm" interactive onClick={onClick} className="flex items-center gap-3">
      <div className={cn('size-11 flex-none rounded-[10px]', gradientForKey(g.coverImageKey))} />
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
