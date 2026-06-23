import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Badge from '../../components/Badge';
import Button from '../../components/Button';
import EmptyState from '../../components/EmptyState';
import { SkeletonCard } from '../../components/Skeleton';
import { ConfirmModal } from '../../components/Modal';
import { useToast } from '../../components/Toast';
import ScheduleAddModal from './ScheduleAddModal';
import { getSchedules, deleteSchedule, reorderSchedules, getTransportLeg } from '../../api/schedule';
import { createVoteSession, getVoteSessions } from '../../api/vote';
import {
  TRANSPORT_META,
  formatKm,
  formatDuration,
  formatCost,
  type Schedule,
  type ReorderItem,
  type TransportLeg,
  type TransportMode,
} from '../../types/schedule';
import { cn } from '../../lib/cn';

type LegState = TransportLeg | 'loading' | 'error' | undefined;

/**
 * 일정 빌더 — 일자(scheduleDate) 탭 + 타임라인 + 드래그 순서변경 + 이동 카드.
 * 순서변경은 reorder 일괄(items[]). 이동 카드는 인접 일정쌍을 /transport 로 조회(기본 CAR).
 * groupId 는 prop(허브) 또는 라우트(:id).
 */
export default function ScheduleBuilderPage({ groupId: groupIdProp }: { groupId?: number }) {
  const params = useParams<{ id: string }>();
  const groupId = groupIdProp ?? Number(params.id);
  const navigate = useNavigate();
  const toast = useToast();

  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [activeIdx, setActiveIdx] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [legs, setLegs] = useState<Record<string, LegState>>({}); // key: `${pair}:${mode}`
  const [legMode, setLegMode] = useState<Record<string, TransportMode>>({}); // pair → 선택 수단(기본 CAR)
  const [deleting, setDeleting] = useState<Schedule | null>(null);
  const [delLoading, setDelLoading] = useState(false);
  const [addOpen, setAddOpen] = useState(false);

  const dragFrom = useRef<number | null>(null);
  const dirty = useRef(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      setSchedules(await getSchedules(groupId));
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [groupId]);

  useEffect(() => {
    load();
  }, [load]);

  // 고유 날짜(정렬) → 일자 탭
  const dates = [...new Set(schedules.map((s) => s.scheduleDate))].sort();
  const activeDate = dates[Math.min(activeIdx, Math.max(0, dates.length - 1))];
  const stops = schedules
    .filter((s) => s.scheduleDate === activeDate)
    .sort((a, b) => a.orderIndex - b.orderIndex);

  // 인접 일정쌍 이동 카드 조회 — 각 쌍의 선택된 수단(기본 CAR)을 조회한다.
  // legMode가 바뀌면(탭 클릭) 재실행돼 해당 수단을 가져온다.
  useEffect(() => {
    let cancelled = false;
    for (let i = 0; i < stops.length - 1; i += 1) {
      // 빈 일정(장소 미정)은 좌표가 없어 이동 계산 불가 → 건너뛴다.
      if (!stops[i].placeId || !stops[i + 1].placeId) continue;
      const pairKey = `${stops[i].id}-${stops[i + 1].id}`;
      const mode = legMode[pairKey] ?? 'CAR';
      const key = `${pairKey}:${mode}`;
      if (legs[key] !== undefined) continue;
      setLegs((prev) => ({ ...prev, [key]: 'loading' }));
      getTransportLeg(groupId, stops[i].id, stops[i + 1].id, mode)
        .then((leg) => { if (!cancelled) setLegs((prev) => ({ ...prev, [key]: leg })); })
        .catch(() => { if (!cancelled) setLegs((prev) => ({ ...prev, [key]: 'error' })); });
    }
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeDate, stops.map((s) => s.id).join(','), legMode]);

  const selectMode = (pairKey: string, mode: TransportMode) =>
    setLegMode((prev) => ({ ...prev, [pairKey]: mode }));

  // 빈 일정의 장소를 투표로 정한다. 진행 중이면 그 투표로, 아니면 새로 만들어 이동.
  const goVote = async (stop: Schedule) => {
    try {
      if (stop.status === 'VOTING') {
        const sessions = await getVoteSessions(groupId, stop.id);
        const open = sessions.find((s) => s.status === 'OPEN') ?? sessions[0];
        if (open) {
          navigate(`/groups/${groupId}/votes/${open.id}`);
          return;
        }
      }
      const session = await createVoteSession(groupId, stop.id, {});
      navigate(`/groups/${groupId}/votes/${session.id}`);
    } catch (e) {
      const message = (e as { response?: { data?: { message?: string } } }).response?.data?.message;
      toast.error('투표로 이동하지 못했어요', message ?? '잠시 후 다시 시도해 주세요.');
    }
  };

  const setStops = (next: Schedule[]) => {
    const others = schedules.filter((s) => s.scheduleDate !== activeDate);
    setSchedules([...others, ...next.map((s, i) => ({ ...s, orderIndex: i }))]);
  };

  const onDragStart = (i: number) => { dragFrom.current = i; dirty.current = false; };
  const onDragOver = (i: number, e: React.DragEvent) => {
    e.preventDefault();
    const from = dragFrom.current;
    if (from == null || from === i) return;
    const next = [...stops];
    const [m] = next.splice(from, 1);
    next.splice(i, 0, m);
    dragFrom.current = i;
    dirty.current = true;
    setStops(next);
  };
  const onDragEnd = async () => {
    dragFrom.current = null;
    if (!dirty.current) return;
    dirty.current = false;
    const items: ReorderItem[] = stops.map((s, i) => ({ scheduleId: s.id, scheduleDate: activeDate, orderIndex: i }));
    try {
      await reorderSchedules(groupId, items);
      setLegs({}); setLegMode({}); // 인접 변동 → 이동 카드 갱신
    } catch {
      toast.error('순서 변경에 실패했어요', '다시 시도해 주세요.');
      load();
    }
  };

  const confirmDelete = async () => {
    if (!deleting) return;
    setDelLoading(true);
    try {
      await deleteSchedule(groupId, deleting.id);
      toast.success('일정을 삭제했어요', deleting.placeName ?? deleting.title ?? undefined);
      setDeleting(null);
      setLegs({}); setLegMode({});
      load();
    } catch {
      toast.error('삭제에 실패했어요', '잠시 후 다시 시도해 주세요.');
    } finally {
      setDelLoading(false);
    }
  };

  if (loading) return <div className="space-y-3"><SkeletonCard /><SkeletonCard /></div>;
  if (error) {
    return (
      <EmptyState title="일정을 불러오지 못했어요" description="잠시 후 다시 시도해 주세요."
        action={<Button variant="secondary" onClick={load}>다시 시도</Button>} />
    );
  }
  if (dates.length === 0) {
    return (
      <div>
        <EmptyState title="아직 일정이 없어요" description="보관함에서 장소를 골라 일정에 추가해 보세요." />
        <Button variant="secondary" fullWidth className="mt-3" onClick={() => setAddOpen(true)}>
          + 장소 추가
        </Button>
        {addOpen && (
          <ScheduleAddModal
            groupId={groupId}
            onClose={() => setAddOpen(false)}
            onAdded={() => { setLegs({}); load(); }}
          />
        )}
      </div>
    );
  }

  return (
    <div>
      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
        {dates.map((d, i) => (
          <button key={d} type="button" aria-pressed={activeIdx === i} onClick={() => setActiveIdx(i)}
            className={cn('shrink-0 rounded-full border px-3.5 py-1.5 text-[13px] font-bold transition-colors',
              activeIdx === i ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-surface text-[#7A6A58]')}>
            {i + 1}일차
          </button>
        ))}
      </div>

      <div className="mt-4">
        {stops.map((stop, i) => {
          const hasNext = i < stops.length - 1;
          // 양쪽 모두 장소가 있어야 이동 정보를 표시한다(빈 일정 제외).
          const showTransport = hasNext && !!stop.placeId && !!stops[i + 1].placeId;
          const pairKey = hasNext ? `${stop.id}-${stops[i + 1].id}` : '';
          const mode = legMode[pairKey] ?? 'CAR';
          return (
          <div key={stop.id}>
            <article draggable onDragStart={() => onDragStart(i)} onDragOver={(e) => onDragOver(i, e)} onDragEnd={onDragEnd} className="flex gap-3">
              <div className="flex flex-none flex-col items-center pt-1">
                <span className="text-[12px] font-extrabold text-[#E8742E]">{stop.startTime}</span>
                <span className="my-1.5 w-0.5 flex-1 bg-[#F0E4D6]" />
              </div>
              <div className="mb-1 flex-1 rounded-card border border-border bg-surface p-3 shadow-sm">
                <div className="flex items-start gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className={cn('truncate text-[15px] font-extrabold', !stop.placeId && 'text-[#A6907B]')}>
                        {stop.placeName ?? stop.title ?? '미정'}
                      </span>
                      {stop.category && <Badge tone="neutral">{stop.category}</Badge>}
                      {!stop.placeId && (
                        <Badge tone={stop.status === 'VOTING' ? 'warning' : 'neutral'}>
                          {stop.status === 'VOTING' ? '투표 중' : '장소 미정'}
                        </Badge>
                      )}
                    </div>
                    <div className="mt-0.5 text-[12px] text-muted">{stop.startTime}–{stop.endTime}</div>
                    {stop.memo && <div className="mt-1 text-[12px] text-[#5C5044]">{stop.memo}</div>}
                    {/* 빈 일정: 투표로 장소 정하기 */}
                    {!stop.placeId && (
                      <button
                        type="button"
                        onClick={() => goVote(stop)}
                        className="mt-2 inline-flex items-center gap-1 rounded-button bg-[#FFF1E6] px-2.5 py-1 text-[12px] font-bold text-[#E8742E]"
                      >
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden>
                          <path d="M9 11l3 3L22 4M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                        {stop.status === 'VOTING' ? '투표 보기' : '투표로 장소 정하기'}
                      </button>
                    )}
                  </div>
                  <span className="cursor-grab text-[#C0AE9B] active:cursor-grabbing" aria-hidden>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M8 7h.01M8 12h.01M8 17h.01M15 7h.01M15 12h.01M15 17h.01" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" /></svg>
                  </span>
                  <button type="button" aria-label="삭제" onClick={() => setDeleting(stop)}
                    className="flex size-7 items-center justify-center rounded-button text-[#8A7B6B] hover:bg-[#FEE2E2] hover:text-danger">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none"><path d="M5 7h14M10 7V5h4v2M6 7l1 13h10l1-13" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
                  </button>
                </div>
              </div>
            </article>
            {showTransport && (
              <TransportRow
                mode={mode}
                leg={legs[`${pairKey}:${mode}`]}
                onSelect={(m) => selectMode(pairKey, m)}
              />
            )}
          </div>
          );
        })}
      </div>

      <Button variant="secondary" fullWidth className="mt-3" onClick={() => setAddOpen(true)}>
        + 장소 추가
      </Button>
      <p className="mt-3 text-center text-[12px] text-[#BCA48C]">⌁ 카드를 드래그해 순서를 바꿀 수 있어요 · 이동시간은 카카오 모빌리티(자차 기준)</p>

      <ConfirmModal open={!!deleting} onClose={() => setDeleting(null)} onConfirm={confirmDelete} loading={delLoading} danger
        title="일정에서 삭제할까요?" description={deleting ? `'${deleting.placeName ?? deleting.title ?? '미정'}'을(를) 일정에서 제거합니다.` : undefined} confirmText="삭제" />

      {addOpen && (
        <ScheduleAddModal
          groupId={groupId}
          defaultDate={activeDate}
          onClose={() => setAddOpen(false)}
          onAdded={() => { setLegs({}); load(); }}
        />
      )}
    </div>
  );
}

const MODE_PATH: Record<TransportMode, string> = {
  CAR: 'M5 11l2-5h10l2 5M5 11h14v5H5v-5ZM7 16v2M17 16v2',
  TRANSIT: 'M6 4h12v11H6zM6 15l-1 4M18 15l1 4M9 18h6M9 8h6',
  WALK: 'M13 5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3ZM11 8l3 2 2-1M11 8l-1 5 3 2 1 5M10 13l-2 6',
};

const MODES: TransportMode[] = ['CAR', 'TRANSIT', 'WALK'];

/** 이동 카드 — 자동차/대중교통/도보 3개 탭(FR-SCHEDULE-04). 선택 수단의 시간·거리·비용 표시. */
function TransportRow({ mode, leg, onSelect }: { mode: TransportMode; leg: LegState; onSelect: (m: TransportMode) => void }) {
  return (
    <div className="my-1 ml-[44px]">
      <div className="flex gap-1">
        {MODES.map((m) => (
          <button
            key={m}
            type="button"
            aria-pressed={mode === m}
            onClick={() => onSelect(m)}
            className={cn(
              'inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold transition-colors',
              mode === m ? 'bg-primary text-primary-foreground' : 'border border-border bg-surface text-[#7A6A58]',
            )}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path d={MODE_PATH[m]} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            {TRANSPORT_META[m].label}
          </button>
        ))}
      </div>
      <TransportInfo leg={leg} />
    </div>
  );
}

function TransportInfo({ leg }: { leg: LegState }) {
  if (leg === undefined || leg === 'loading') {
    return <div className="mt-1 py-0.5 text-[12px] text-[#C0AE9B]">이동 정보 계산 중…</div>;
  }
  if (leg === 'error') {
    return <div className="mt-1 py-0.5 text-[12px] text-[#C0AE9B]">이동 정보를 불러오지 못했어요</div>;
  }
  if (!leg.available) {
    // 대중교통(카카오 공개 API 미지원) 등
    return <div className="mt-1 py-0.5 text-[12px] text-[#C0AE9B]">{TRANSPORT_META[leg.mode].label} 이동 정보 제공 불가</div>;
  }
  const cost = leg.mode === 'CAR' ? leg.carCost : leg.mode === 'TRANSIT' ? leg.transitFare : 0;
  return (
    <div className="mt-1 py-0.5 text-[12px] font-semibold text-[#A6907B]">
      {formatDuration(leg.durationMinutes)} · {formatKm(leg.distanceMeters)}
      {cost > 0 && <> · {formatCost(cost)}</>}
      {leg.routeSummary && <span className="text-[#C0AE9B]"> · {leg.routeSummary}</span>}
    </div>
  );
}
