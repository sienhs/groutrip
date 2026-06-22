import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import AppLayout from '../../components/AppLayout';
import Badge from '../../components/Badge';
import Button from '../../components/Button';
import EmptyState from '../../components/EmptyState';
import { SkeletonCard } from '../../components/Skeleton';
import { useToast } from '../../components/Toast';
import { getVoteSession, castVote, closeVoteSession } from '../../api/vote';
import { cn } from '../../lib/cn';
import type { VoteSession, VoteCandidate } from '../../types/vote';

/**
 * 투표 상세 — 후보(장소)별 점수 투표(1~5). 막대 그래프 + 실명 명단 + 마감.
 * 라우트: /groups/:id/votes/:voteId (voteId = sessionId).
 */
export default function VoteDetailPage(props: { groupId?: number; sessionId?: number }) {
  const params = useParams<{ id: string; voteId: string }>();
  const groupId = props.groupId ?? Number(params.id);
  const sessionId = props.sessionId ?? Number(params.voteId);
  const toast = useToast();

  const [session, setSession] = useState<VoteSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    setLoading(true);
    setError(false);
    try {
      setSession(await getVoteSession(groupId, sessionId));
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [groupId, sessionId]);

  const onScore = async (candidateId: number, score: number) => {
    setBusy(true);
    try {
      setSession(await castVote(groupId, sessionId, { candidateId, score }));
      toast.success('투표했어요', `${score}점`);
    } catch {
      toast.error('투표에 실패했어요', '잠시 후 다시 시도해 주세요.');
    } finally {
      setBusy(false);
    }
  };

  const onClose = async () => {
    setBusy(true);
    try {
      setSession(await closeVoteSession(groupId, sessionId));
      toast.success('투표를 마감했어요');
    } catch {
      toast.error('마감하지 못했어요', '동점이면 Owner가 후보를 지정해 마감해야 해요.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <AppLayout title="투표" showBack>
      {loading && <SkeletonCard />}
      {!loading && (error || !session) && (
        <EmptyState title="투표를 불러오지 못했어요" description="삭제되었거나 일시적 오류일 수 있어요."
          action={<Button variant="secondary" onClick={load}>다시 시도</Button>} />
      )}
      {!loading && session && <SessionBody session={session} busy={busy} onScore={onScore} onClose={onClose} />}
    </AppLayout>
  );
}

function SessionBody({ session, busy, onScore, onClose }: { session: VoteSession; busy: boolean; onScore: (c: number, s: number) => void; onClose: () => void }) {
  const closed = session.status === 'CLOSED';
  const maxScore = Math.max(1, ...session.candidates.map((c) => c.totalScore));

  return (
    <div>
      <div className="flex items-center gap-2">
        <Badge tone={closed ? 'danger' : 'info'}>{closed ? '마감' : '진행 중'}</Badge>
        {!session.hasVoted && !closed && <Badge tone="warning">아직 투표 안 함</Badge>}
      </div>
      <h1 className="mt-3 text-[21px] font-extrabold tracking-tight">{session.title ?? '장소 투표'}</h1>
      {session.closesAt && (
        <p className="mt-1 text-[13px] text-muted">
          {new Date(session.closesAt).toLocaleString('ko-KR', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })} 마감
        </p>
      )}

      <div className="mt-5 space-y-3">
        {session.candidates.map((c) => (
          <CandidateCard key={c.id} candidate={c} maxScore={maxScore} winner={session.winnerCandidateId === c.id} closed={closed} busy={busy} onScore={onScore} />
        ))}
      </div>

      {!closed && (
        <Button variant="secondary" fullWidth className="mt-5" loading={busy} onClick={onClose}>
          투표 마감
        </Button>
      )}
    </div>
  );
}

function CandidateCard({ candidate, maxScore, winner, closed, busy, onScore }: {
  candidate: VoteCandidate; maxScore: number; winner: boolean; closed: boolean; busy: boolean; onScore: (c: number, s: number) => void;
}) {
  const pct = Math.round((candidate.totalScore / maxScore) * 100);
  return (
    <div className={cn('rounded-card border bg-surface p-3.5', winner ? 'border-primary' : 'border-border')}>
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span className="truncate text-[15px] font-extrabold">{candidate.place.name}</span>
            {winner && <Badge tone="primary">당선</Badge>}
          </div>
          <div className="mt-0.5 text-[12px] text-muted">{candidate.registeredByName} 등록{candidate.memo ? ` · ${candidate.memo}` : ''}</div>
        </div>
        <div className="text-right">
          <div className="text-[15px] font-extrabold text-[#E8742E]">{candidate.totalScore}점</div>
          <div className="text-[11px] text-muted">{candidate.voteCount}명</div>
        </div>
      </div>

      {/* 득점 막대 — 동적 width 인라인 style */}
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-[#F0E4D6]">
        <div className={cn('h-full rounded-full', winner ? 'bg-primary' : 'bg-gradient-to-r from-[#FFB585] to-[#FF8A47]')} style={{ width: `${pct}%` }} />
      </div>

      {/* 점수 투표 1~5 */}
      {!closed && (
        <div className="mt-3 flex items-center gap-1.5">
          <span className="mr-1 text-[12px] font-bold text-muted">내 점수</span>
          {[1, 2, 3, 4, 5].map((n) => (
            <button key={n} type="button" disabled={busy} aria-label={`${n}점`} onClick={() => onScore(candidate.id, n)}
              className="flex size-8 items-center justify-center rounded-full border-2 border-[#E7D7C5] text-[13px] font-extrabold text-[#7A6A58] transition-colors hover:border-primary hover:text-[#E8742E] disabled:opacity-50">
              {n}
            </button>
          ))}
        </div>
      )}

      {/* 투표자 실명 */}
      {candidate.voters.length > 0 && (
        <div className="mt-2.5 flex flex-wrap gap-1.5">
          {candidate.voters.map((v) => (
            <span key={v.userId} className="rounded-full bg-background px-2.5 py-1 text-[11px] font-semibold text-[#5C5044]">
              {v.name} {v.score}점
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
