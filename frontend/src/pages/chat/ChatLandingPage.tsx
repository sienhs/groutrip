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
 * 채팅 탭 진입점. 채팅은 그룹 단위이므로 내가 속한 그룹들을 채팅방 목록으로 보여준다.
 * 방 선택 시 해당 그룹의 채팅 화면(/groups/:id/chat)으로 이동.
 */
export default function ChatLandingPage() {
  const navigate = useNavigate();
  const { data: groups = [], isLoading: loading, isError: error } = useQuery({
    queryKey: appQueryKeys.myGroups(),
    queryFn: getMyGroups,
  });

  return (
    <AppLayout title="채팅">
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
          title="채팅방이 없어요"
          description="그룹을 만들면 멤버들과 실시간으로 대화할 수 있어요."
          action={<Button onClick={() => navigate('/groups/new')}>그룹 만들기</Button>}
        />
      ) : (
        <div className="space-y-2.5">
          {groups.map((g) => (
            <Card
              key={g.id}
              padding="none"
              interactive
              onClick={() => navigate(`/groups/${g.id}/chat`)}
              className="overflow-hidden"
            >
              <div className="flex items-center gap-3 p-3">
                {/* 방 아바타 — 그룹 커버 그라데이션 */}
                <div className={cn('flex size-12 shrink-0 items-center justify-center rounded-full', gradientForKey(g.coverImageKey))}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
                    <path
                      d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5Z"
                      stroke="#fff"
                      strokeWidth="1.9"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[15px] font-extrabold">{g.title}</div>
                  <div className="mt-0.5 truncate text-[12px] text-muted">
                    {g.destination} · {dateRange(g.startDate, g.endDate)}
                  </div>
                </div>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden className="shrink-0 text-muted">
                  <path d="m9 6 6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
            </Card>
          ))}
        </div>
      )}
    </AppLayout>
  );
}
