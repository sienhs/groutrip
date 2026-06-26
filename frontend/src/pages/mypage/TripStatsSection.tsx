import { useQuery } from '@tanstack/react-query';
import Button from '../../components/Button';
import { getMyStats, type MyStats } from '../../api/user';
import { appQueryKeys } from '../../queryKeys/appQueryKeys';
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

/** 마이페이지 '내 여행 통계 + 도전과제' 섹션. 통계는 자체 조회하며 재시도는 refetch. */
export default function TripStatsSection() {
  const { data: stats, isLoading: statsLoading, isError: statsError, refetch } = useQuery({
    queryKey: appQueryKeys.myStats(),
    queryFn: getMyStats,
  });
  const loadStats = () => { void refetch(); };

  // 참여 그룹·보관·지출이 모두 0이면 "아직 데이터 없음"으로 본다.
  const statsEmpty =
    stats != null && stats.totalTrips === 0 && stats.bookmarkCount === 0 && stats.totalSpending === 0;

  return (
    <>
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
    </>
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
