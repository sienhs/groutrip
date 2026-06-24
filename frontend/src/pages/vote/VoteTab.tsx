import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import Button from '../../components/Button';
import Badge from '../../components/Badge';
import Modal from '../../components/Modal';
import Input from '../../components/Input';
import Select from '../../components/Select';
import EmptyState from '../../components/EmptyState';
import { SkeletonCard } from '../../components/Skeleton';
import { useToast } from '../../components/Toast';
import { getSchedules } from '../../api/schedule';
import { getVoteSessions, createVoteSession } from '../../api/vote';
import { groupQueryKeys } from '../../queryKeys/groupQueryKeys';
import type { Schedule } from '../../types/schedule';
import type { VoteSession } from '../../types/vote';

type Row = { session: VoteSession; schedule: Schedule | null };
type Status = 'loading' | 'done' | 'error';

/**
 * 그룹 허브 '투표' 탭 — 일정에 종속된 투표 세션을 그룹 단위로 모아 보여준다.
 * (그룹 전체 세션 목록 엔드포인트가 없어 일정별 getVoteSessions를 합산한다.)
 * 투표 만들기: 일정 선택 → createVoteSession → 상세로 이동(후보 등록/투표/마감).
 */
export default function VoteTab({ groupId }: { groupId: number; isOwner?: boolean }) {
  const navigate = useNavigate();
  const toast = useToast();

  const [createOpen, setCreateOpen] = useState(false);
  const [scheduleId, setScheduleId] = useState('');
  const [title, setTitle] = useState('');
  const [creating, setCreating] = useState(false);

  // 일정별 투표 세션을 합산(그룹 전체 세션 엔드포인트 부재). 최근(세션 id 큰 순) 정렬.
  const fetchRows = async (): Promise<{ schedules: Schedule[]; rows: Row[] }> => {
    const sch = await getSchedules(groupId);
    const lists = await Promise.all(
      sch.map((s) =>
        getVoteSessions(groupId, s.id).then((list) => list.map((session) => ({ session, schedule: s }))),
      ),
    );
    return { schedules: sch, rows: lists.flat().sort((a, b) => b.session.id - a.session.id) };
  };

  // VOTE_* SSE 이벤트가 이 키(votes)를 무효화하면 자동 refetch된다.
  const voteQuery = useQuery({
    queryKey: groupQueryKeys.votes(groupId),
    queryFn: fetchRows,
    enabled: Number.isFinite(groupId),
  });
  const schedules = voteQuery.data?.schedules ?? [];
  const rows = voteQuery.data?.rows ?? [];
  const status: Status = voteQuery.isLoading ? 'loading' : voteQuery.isError ? 'error' : 'done';

  const openCreate = () => {
    setTitle('');
    setScheduleId(schedules[0] ? String(schedules[0].id) : '');
    setCreateOpen(true);
  };

  const handleCreate = async () => {
    if (!scheduleId) return;
    setCreating(true);
    try {
      const session = await createVoteSession(groupId, Number(scheduleId), { title: title.trim() || undefined });
      setCreateOpen(false);
      toast.success('투표를 만들었어요', '후보를 등록해 멤버들과 정해보세요.');
      navigate(`/groups/${groupId}/votes/${session.id}`);
    } catch (e) {
      const message = (e as { response?: { data?: { message?: string } } }).response?.data?.message;
      toast.error('투표를 만들지 못했어요', message ?? '잠시 후 다시 시도해 주세요.');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div>
      <button
        type="button"
        onClick={openCreate}
        disabled={schedules.length === 0 && status === 'done'}
        className="mb-3.5 flex w-full items-center justify-center gap-2 rounded-[10px] border border-dashed border-[#FFCBA6] bg-[#FFF7F0] py-3 text-[14px] font-bold text-[#E8742E] active:bg-[#FFEEDF] disabled:cursor-not-allowed disabled:opacity-60"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
          <path d="M9 11l3 3L22 4M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        투표 만들기
      </button>

      {status === 'loading' && [0, 1].map((i) => <SkeletonCard key={i} />)}

      {status === 'error' && (
        <EmptyState
          title="투표를 불러오지 못했어요"
          description="잠시 후 다시 시도해 주세요."
          action={<Button variant="secondary" onClick={() => voteQuery.refetch()}>다시 시도</Button>}
        />
      )}

      {status === 'done' && schedules.length === 0 && (
        <EmptyState
          title="먼저 일정을 추가해 주세요"
          description="투표는 일정에 붙는 형태예요. '일정' 탭에서 장소를 추가한 뒤 투표를 만들 수 있어요."
        />
      )}

      {status === 'done' && schedules.length > 0 && rows.length === 0 && (
        <EmptyState
          title="아직 투표가 없어요"
          description="'투표 만들기'로 의견이 갈리는 일정을 함께 정해보세요."
        />
      )}

      {status === 'done' && rows.length > 0 && (
        <div className="space-y-2.5">
          {rows.map(({ session, schedule }) => {
            const closed = session.status === 'CLOSED';
            return (
              <button
                key={session.id}
                type="button"
                onClick={() => navigate(`/groups/${groupId}/votes/${session.id}`)}
                className="flex w-full items-center gap-3 rounded-card border border-border bg-surface p-3.5 text-left active:scale-[0.99]"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="truncate text-[15px] font-extrabold text-foreground">
                      {session.title ?? '장소 투표'}
                    </span>
                  </div>
                  <div className="mt-0.5 truncate text-[12px] text-muted">
                    {schedule ? `${schedule.scheduleDate.slice(5).replace('-', '.')} · ${schedule.placeName}` : '일정'}
                    {` · 후보 ${session.candidates.length}`}
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-1.5">
                  {!closed && !session.hasVoted && <Badge tone="warning">투표 전</Badge>}
                  <Badge tone={closed ? 'danger' : 'info'}>{closed ? '마감' : '진행 중'}</Badge>
                </div>
              </button>
            );
          })}
        </div>
      )}

      <Modal
        open={createOpen}
        onClose={() => !creating && setCreateOpen(false)}
        title="투표 만들기"
        description="어느 일정에 대한 투표인가요?"
        footer={
          <>
            <Button variant="ghost" fullWidth className="border border-border" onClick={() => setCreateOpen(false)} disabled={creating}>
              취소
            </Button>
            <Button fullWidth onClick={handleCreate} loading={creating} disabled={!scheduleId}>
              만들기
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <Select
            label="일정"
            value={scheduleId}
            onChange={(e) => setScheduleId(e.target.value)}
            options={schedules.map((s) => ({
              value: String(s.id),
              label: `${s.scheduleDate.slice(5).replace('-', '.')} ${s.startTime} · ${s.placeName}`,
            }))}
          />
          <Input
            label="제목 (선택)"
            value={title}
            maxLength={100}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="예: 저녁 장소 정하기"
          />
        </div>
      </Modal>
    </div>
  );
}
