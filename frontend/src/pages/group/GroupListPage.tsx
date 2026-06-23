import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { AxiosError } from 'axios';
import AppLayout from '../../components/AppLayout';
import Card from '../../components/Card';
import Button from '../../components/Button';
import Input from '../../components/Input';
import Modal from '../../components/Modal';
import EmptyState from '../../components/EmptyState';
import { SkeletonCard } from '../../components/Skeleton';
import { useToast } from '../../components/Toast';
import { getMyGroups, joinGroup } from '../../api/group';
import GroupCover from './GroupCover';
import { ddayLabel, dateRange, groupStatus } from './groupUi';
import { cn } from '../../lib/cn';
import type { ApiResponse } from '../../types/auth';
import type { GroupStatus, TravelGroup } from '../../types/group';

const FILTERS: ReadonlyArray<{ value: GroupStatus | 'ALL'; label: string }> = [
  { value: 'ALL', label: '전체' },
  { value: 'IN_PROGRESS', label: '진행 중' },
  { value: 'PLANNING', label: '예정' },
  { value: 'COMPLETED', label: '완료' },
];

/** 내 그룹 목록. 상태 필터 + 그룹 카드. */
export default function GroupListPage() {
  const navigate = useNavigate();
  const toast = useToast();
  const [groups, setGroups] = useState<TravelGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [filter, setFilter] = useState<GroupStatus | 'ALL'>('ALL');

  // 초대 코드로 참여
  const [joinOpen, setJoinOpen] = useState(false);
  const [joinCode, setJoinCode] = useState('');
  const [joining, setJoining] = useState(false);

  const handleJoin = async () => {
    const code = joinCode.trim().toUpperCase();
    if (!code) return;
    setJoining(true);
    try {
      const group = await joinGroup(code);
      toast.success('그룹에 참여했어요', group.title);
      setJoinOpen(false);
      setJoinCode('');
      navigate(`/groups/${group.id}`);
    } catch (err) {
      const message = (err as AxiosError<ApiResponse<null>>).response?.data?.message;
      toast.error('참여하지 못했어요', message ?? '초대 코드를 다시 확인해 주세요.');
    } finally {
      setJoining(false);
    }
  };

  useEffect(() => {
    (async () => {
      try {
        setGroups(await getMyGroups());
      } catch {
        setError(true);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const counts = (s: GroupStatus) => groups.filter((g) => groupStatus(g.startDate, g.endDate) === s).length;
  const shown = groups.filter(
    (g) => filter === 'ALL' || groupStatus(g.startDate, g.endDate) === filter,
  );

  const addBtn = (
    <button
      type="button"
      aria-label="그룹 만들기"
      onClick={() => navigate('/groups/new')}
      className="flex size-9 items-center justify-center rounded-[9px] bg-[#FFF1E6] text-[#E8742E]"
    >
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
        <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
      </svg>
    </button>
  );

  return (
    <AppLayout title="내 그룹" headerActions={addBtn}>
      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
        {FILTERS.map((f) => {
          const active = filter === f.value;
          const n = f.value === 'ALL' ? groups.length : counts(f.value);
          return (
            <button
              key={f.value}
              type="button"
              aria-pressed={active}
              onClick={() => setFilter(f.value)}
              className={cn(
                'shrink-0 rounded-full border px-3.5 py-1.5 text-[13px] font-bold transition-colors',
                active
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'border-border bg-surface text-[#7A6A58]',
              )}
            >
              {f.label} {n}
            </button>
          );
        })}
      </div>

      {/* 초대 코드로 참여 진입 */}
      <button
        type="button"
        onClick={() => setJoinOpen(true)}
        className="mt-3 flex w-full items-center justify-center gap-2 rounded-[10px] border border-dashed border-[#FFCBA6] bg-[#FFF7F0] py-3 text-[14px] font-bold text-[#E8742E] active:bg-[#FFEEDF]"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
          <path d="M9 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM3.5 19c0-3 2.5-5 5.5-5M16 11h6M19 8v6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        초대 코드로 참여하기
      </button>

      <div className="mt-4 space-y-3">
        {loading && [0, 1].map((i) => <SkeletonCard key={i} />)}

        {!loading && error && (
          <EmptyState
            title="그룹을 불러오지 못했어요"
            description="잠시 후 다시 시도해 주세요."
            action={<Button variant="secondary" onClick={() => window.location.reload()}>새로고침</Button>}
          />
        )}

        {!loading && !error && shown.length === 0 && (
          <EmptyState
            title="그룹이 없어요"
            description="새 여행 그룹을 만들어 보세요."
            action={<Button onClick={() => navigate('/groups/new')}>그룹 만들기</Button>}
          />
        )}

        {!loading && !error &&
          shown.map((g) => (
            <Card key={g.id} padding="none" interactive onClick={() => navigate(`/groups/${g.id}`)} className="overflow-hidden">
              <GroupCover groupId={g.id} coverImageKey={g.coverImageKey} className="h-20 p-3">
                <span className="relative rounded-full bg-white/25 px-2.5 py-1 text-[11px] font-extrabold text-white">
                  {ddayLabel(g.startDate, g.endDate)}
                </span>
              </GroupCover>
              <div className="p-3.5">
                <div className="text-[16px] font-extrabold">{g.title}</div>
                <div className="mt-0.5 text-[12px] text-muted">
                  {g.destination} · {dateRange(g.startDate, g.endDate)}
                </div>
              </div>
            </Card>
          ))}
      </div>

      <Modal
        open={joinOpen}
        onClose={() => !joining && setJoinOpen(false)}
        title="초대 코드로 참여"
        description="그룹장에게 받은 초대 코드를 입력하세요."
        footer={
          <>
            <Button variant="ghost" fullWidth onClick={() => setJoinOpen(false)} className="border border-border" disabled={joining}>
              취소
            </Button>
            <Button fullWidth onClick={handleJoin} loading={joining} disabled={!joinCode.trim()}>
              참여하기
            </Button>
          </>
        }
      >
        <Input
          value={joinCode}
          onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
          onKeyDown={(e) => e.key === 'Enter' && handleJoin()}
          placeholder="예: ZSH6AY"
          maxLength={12}
          autoFocus
          className="text-center text-[18px] font-extrabold tracking-[0.2em]"
        />
      </Modal>
    </AppLayout>
  );
}
