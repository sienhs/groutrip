import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import AppLayout from '../../components/AppLayout';
import Badge from '../../components/Badge';
import Button from '../../components/Button';
import Modal from '../../components/Modal';
import Input from '../../components/Input';
import EmptyState from '../../components/EmptyState';
import { SkeletonCard } from '../../components/Skeleton';
import { useToast } from '../../components/Toast';
import { getVoteSession, castVote, closeVoteSession, addCandidate } from '../../api/vote';
import { getBookmarks, addBookmark, searchPlaces } from '../../api/place';
import { cn } from '../../lib/cn';
import type { VoteSession, VoteCandidate } from '../../types/vote';
import type { BookmarkResponse, PlaceSearchResult } from '../../types/place';

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

  // 후보 추가(FR-VOTE-01): 보관함 또는 검색으로 장소를 골라 후보로 등록
  const [addOpen, setAddOpen] = useState(false);
  const [addTab, setAddTab] = useState<'bookmark' | 'search'>('bookmark');
  const [bookmarks, setBookmarks] = useState<BookmarkResponse[]>([]);
  const [bmLoading, setBmLoading] = useState(false);
  const [addingId, setAddingId] = useState<number | null>(null);
  // 검색 탭
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<PlaceSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [addingGid, setAddingGid] = useState<string | null>(null);

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

  const openAddCandidate = async () => {
    setAddOpen(true);
    setAddTab('bookmark');
    setSearchQuery('');
    setSearchResults([]);
    setBmLoading(true);
    try {
      setBookmarks(await getBookmarks(groupId));
    } catch {
      toast.error('보관함을 불러오지 못했어요', '잠시 후 다시 시도해 주세요.');
    } finally {
      setBmLoading(false);
    }
  };

  const candidateError = (e: unknown) =>
    toast.error(
      '후보를 추가하지 못했어요',
      (e as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        '이미 등록됐거나 1인 5개 한도를 넘었을 수 있어요.',
    );

  const registerCandidate = async (placeId: number) => {
    await addCandidate(groupId, sessionId, { placeId });
    setSession(await getVoteSession(groupId, sessionId));
    toast.success('후보를 추가했어요');
    setAddOpen(false);
  };

  const onAddCandidate = async (placeId: number) => {
    setAddingId(placeId);
    try {
      await registerCandidate(placeId);
    } catch (e) {
      candidateError(e);
    } finally {
      setAddingId(null);
    }
  };

  const runCandidateSearch = async () => {
    if (!searchQuery.trim()) return;
    setSearching(true);
    try {
      const page = await searchPlaces(groupId, searchQuery.trim());
      setSearchResults(page.items);
    } catch {
      toast.error('검색에 실패했어요', '잠시 후 다시 시도해 주세요.');
    } finally {
      setSearching(false);
    }
  };

  // 검색 결과를 후보로: 보관함에 없으면 담아 placeId를 확보한 뒤 후보 등록.
  const onAddSearchedPlace = async (place: PlaceSearchResult) => {
    setAddingGid(place.googlePlaceId);
    try {
      let placeId: number;
      try {
        const bm = await addBookmark(groupId, { googlePlaceId: place.googlePlaceId, categoryTag: place.category });
        placeId = bm.place.placeId;
      } catch {
        // 이미 보관함에 있으면(409 등) 기존 placeId를 찾아 사용
        const found = (await getBookmarks(groupId)).find((b) => b.place.googlePlaceId === place.googlePlaceId);
        if (!found) throw new Error('placeId 확보 실패');
        placeId = found.place.placeId;
      }
      await registerCandidate(placeId);
    } catch (e) {
      candidateError(e);
    } finally {
      setAddingGid(null);
    }
  };

  const candidatePlaceIds = new Set(session?.candidates.map((c) => c.place.placeId) ?? []);

  return (
    <AppLayout title="투표" showBack>
      {loading && <SkeletonCard />}
      {!loading && (error || !session) && (
        <EmptyState title="투표를 불러오지 못했어요" description="삭제되었거나 일시적 오류일 수 있어요."
          action={<Button variant="secondary" onClick={load}>다시 시도</Button>} />
      )}
      {!loading && session && (
        <SessionBody session={session} busy={busy} onScore={onScore} onClose={onClose} onAddCandidate={openAddCandidate} />
      )}

      <Modal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        title="후보 추가"
        description="보관함 장소 또는 검색해서 투표 후보로 등록해요."
      >
        <div className="space-y-3">
          {/* 탭: 보관함 / 검색 */}
          <div className="flex gap-1.5">
            {([
              { v: 'bookmark', label: '보관함' },
              { v: 'search', label: '검색' },
            ] as const).map((o) => (
              <button
                key={o.v}
                type="button"
                onClick={() => setAddTab(o.v)}
                aria-pressed={addTab === o.v}
                className={cn(
                  'flex-1 rounded-button px-2 py-2 text-[13px] font-bold transition-colors',
                  addTab === o.v ? 'bg-primary text-primary-foreground' : 'border border-border bg-surface text-[#7A6A58]',
                )}
              >
                {o.label}
              </button>
            ))}
          </div>

          {addTab === 'bookmark' ? (
            bmLoading ? (
              <p className="py-8 text-center text-[13px] text-muted">불러오는 중…</p>
            ) : bookmarks.length === 0 ? (
              <p className="py-8 text-center text-[13px] text-muted">보관함이 비어 있어요. ‘검색’ 탭에서 찾아 등록해 보세요.</p>
            ) : (
              <div className="max-h-[46vh] space-y-2 overflow-y-auto">
                {bookmarks.map((b) => {
                  const already = candidatePlaceIds.has(b.place.placeId);
                  return (
                    <div key={b.id} className="flex items-center gap-3 rounded-card border border-border bg-surface p-2.5">
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-[14px] font-bold text-[#3A322B]">{b.place.name}</div>
                        {b.place.address && <div className="truncate text-[12px] text-muted">{b.place.address}</div>}
                      </div>
                      <Button
                        size="sm"
                        variant={already ? 'secondary' : 'primary'}
                        disabled={already || addingId != null}
                        loading={addingId === b.place.placeId}
                        onClick={() => onAddCandidate(b.place.placeId)}
                      >
                        {already ? '등록됨' : '후보로'}
                      </Button>
                    </div>
                  );
                })}
              </div>
            )
          ) : (
            <>
              <div className="flex gap-2">
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && runCandidateSearch()}
                  placeholder="장소·키워드 검색 (예: 용인 맛집)"
                />
                <Button onClick={runCandidateSearch} loading={searching} disabled={!searchQuery.trim()}>
                  검색
                </Button>
              </div>
              {searchResults.length === 0 ? (
                <p className="py-8 text-center text-[13px] text-muted">검색 결과가 여기에 표시돼요.</p>
              ) : (
                <div className="max-h-[40vh] space-y-2 overflow-y-auto">
                  {searchResults.map((p) => (
                    <div key={p.googlePlaceId} className="flex items-center gap-3 rounded-card border border-border bg-surface p-2.5">
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-[14px] font-bold text-[#3A322B]">{p.name}</div>
                        {p.address && <div className="truncate text-[12px] text-muted">{p.address}</div>}
                      </div>
                      <Button
                        size="sm"
                        disabled={addingGid != null}
                        loading={addingGid === p.googlePlaceId}
                        onClick={() => onAddSearchedPlace(p)}
                      >
                        후보로
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </Modal>
    </AppLayout>
  );
}

function SessionBody({ session, busy, onScore, onClose, onAddCandidate }: { session: VoteSession; busy: boolean; onScore: (c: number, s: number) => void; onClose: () => void; onAddCandidate: () => void }) {
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
        {session.candidates.length === 0 && (
          <p className="rounded-card border border-dashed border-border py-8 text-center text-[13px] text-muted">
            아직 후보가 없어요. 보관함 장소를 후보로 추가해 보세요.
          </p>
        )}
        {session.candidates.map((c) => (
          <CandidateCard key={c.id} candidate={c} maxScore={maxScore} winner={session.winnerCandidateId === c.id} closed={closed} busy={busy} onScore={onScore} />
        ))}
      </div>

      {!closed && (
        <>
          <Button variant="secondary" fullWidth className="mt-3" onClick={onAddCandidate}>
            + 후보 추가
          </Button>
          <Button fullWidth className="mt-2" loading={busy} disabled={session.candidates.length === 0} onClick={onClose}>
            투표 마감
          </Button>
        </>
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
