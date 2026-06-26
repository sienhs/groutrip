import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import AppLayout from '../../components/AppLayout';
import Card from '../../components/Card';
import Button from '../../components/Button';
import EmptyState from '../../components/EmptyState';
import { SkeletonCard } from '../../components/Skeleton';
import { getMyGroups } from '../../api/group';
import { appQueryKeys } from '../../queryKeys/appQueryKeys';
import { gradientForKey, dateRange } from '../group/groupUi';
import { cn } from '../../lib/cn';

/**
 * 추천 탭 진입점. 추천은 그룹 목적지 기반(FR-RECOMMEND)이라 그룹을 먼저 고른다.
 * 그룹 선택 시 해당 그룹의 추천 화면(/groups/:id/recommend)으로 이동.
 */
export default function RecommendLandingPage() {
  const navigate = useNavigate();
  const { data: groups = [], isLoading: loading, isError: error } = useQuery({
    queryKey: appQueryKeys.myGroups(),
    queryFn: getMyGroups,
  });

  return (
    <AppLayout title="여행지 추천">
      {loading ? (
        <div className="space-y-3">{[0, 1].map((i) => <SkeletonCard key={i} />)}</div>
      ) : error ? (
        <EmptyState
          title="불러오지 못했어요"
          description="잠시 후 다시 시도해 주세요."
          action={<Button variant="secondary" onClick={() => window.location.reload()}>새로고침</Button>}
        />
      ) : groups.length === 0 ? (
        <EmptyState
          title="추천받을 그룹이 없어요"
          description="그룹을 만들면 목적지 기반 맞춤 여행지를 추천해드려요."
          action={<Button onClick={() => navigate('/groups/new')}>그룹 만들기</Button>}
        />
      ) : (
        <>
          <p className="mb-3 text-[13px] text-muted">그룹을 선택하면 목적지 기반 추천을 보여드려요.</p>
          <div className="space-y-3">
            {groups.map((g) => (
              <Card
                key={g.id}
                padding="none"
                interactive
                onClick={() => navigate(`/groups/${g.id}/recommend`)}
                className="overflow-hidden"
              >
                <div className={cn('h-16', gradientForKey(g.coverImageKey))} />
                <div className="p-3.5">
                  <div className="text-[15px] font-extrabold">{g.title}</div>
                  <div className="mt-0.5 text-[12px] text-muted">
                    {g.destination} · {dateRange(g.startDate, g.endDate)}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </>
      )}
    </AppLayout>
  );
}
