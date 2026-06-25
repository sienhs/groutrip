import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import Badge from '../../components/Badge';
import Button from '../../components/Button';
import EmptyState from '../../components/EmptyState';
import { SkeletonCard } from '../../components/Skeleton';
import { ConfirmModal } from '../../components/Modal';
import { useToast } from '../../components/Toast';
import ScheduleAddModal from './ScheduleAddModal';
import PlacePickerModal from '../place/PlacePickerModal';
import { getSchedules, deleteSchedule, reorderSchedules, getTransportLeg, updateSchedule, setSchedulePlace, setScheduleCost } from '../../api/schedule';
import { createVoteSession, getVoteSessions } from '../../api/vote';
import { getGroup, getGroupMembers } from '../../api/group';
import { getAccommodations } from '../../api/accommodation';
import { placePhotoSrc } from '../../api/place';
import { naverPlaceUrl } from '../../lib/naver';
import useAuthStore from '../../store/authStore';
import type { Accommodation } from '../../types/accommodation';
import { groupQueryKeys } from '../../queryKeys/groupQueryKeys';
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

const toMin = (t: string): number => {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
};
const toHHMM = (min: number): string => {
  const v = ((min % 1440) + 1440) % 1440;
  return `${String(Math.floor(v / 60)).padStart(2, '0')}:${String(v % 60).padStart(2, '0')}`;
};

// "YYYY-MM-DD" 하루 더하기(정오 기준으로 타임존 경계 회피).
const addDay = (ymd: string): string => {
  const d = new Date(`${ymd}T12:00:00`);
  d.setDate(d.getDate() + 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
// 여행 기간(start~end)의 모든 날짜를 일자 탭으로 나열한다.
const enumerateDates = (start: string, end: string): string[] => {
  const out: string[] = [];
  let cur = start;
  for (let i = 0; cur <= end && i < 60; i += 1) {
    out.push(cur);
    cur = addDay(cur);
  }
  return out;
};

// 드래그 후 새 순서 기준으로 시간 재계산: 첫 일정은 유지, 이후 일정은 직전 일정 종료 이후로 시작(소요시간 보존).
const recomputeTimes = (list: Schedule[]): Schedule[] => {
  let prevEnd: number | null = null;
  return list.map((s) => {
    if (prevEnd === null) {
      prevEnd = toMin(s.endTime);
      return s;
    }
    const dur = toMin(s.endTime) - toMin(s.startTime);
    const start = prevEnd;
    const end = start + (dur > 0 ? dur : 60);
    prevEnd = end;
    return { ...s, startTime: toHHMM(start), endTime: toHHMM(end) };
  });
};

/**
 * 일정 빌더 — 일자(scheduleDate) 탭 + 타임라인 + 드래그 순서변경 + 이동 카드.
 * 순서변경은 reorder 일괄(items[]). 이동 카드는 인접 일정쌍을 /transport 로 조회(기본 CAR).
 * groupId 는 prop(허브) 또는 라우트(:id).
 */
export default function ScheduleBuilderPage({ groupId: groupIdProp, isOwner = false }: { groupId?: number; isOwner?: boolean }) {
  const params = useParams<{ id: string }>();
  const groupId = groupIdProp ?? Number(params.id);
  const navigate = useNavigate();
  const toast = useToast();
  const queryClient = useQueryClient();
  const [pickFor, setPickFor] = useState<Schedule | null>(null);

  const [activeIdx, setActiveIdx] = useState(0);
  const [legs, setLegs] = useState<Record<string, LegState>>({}); // key: `${pair}:${mode}`
  const [legMode, setLegMode] = useState<Record<string, TransportMode>>({}); // pair → 선택 수단(기본 CAR)
  const [deleting, setDeleting] = useState<Schedule | null>(null);
  const [delLoading, setDelLoading] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  // 예상 비용 인라인 편집(어떤 일정의 비용을 고치는 중인지 + 입력값 + 결제자).
  const [costEditId, setCostEditId] = useState<number | null>(null);
  const [costDraft, setCostDraft] = useState('');
  const [costPayerId, setCostPayerId] = useState<number | null>(null);
  const [costSaving, setCostSaving] = useState(false);
  const currentUserId = useAuthStore((s) => s.user?.id ?? -1);

  // 결제자 선택용 멤버 목록(예상 비용을 정산 지출로 등록할 때 필요).
  const membersQuery = useQuery({
    queryKey: groupQueryKeys.members(groupId),
    queryFn: () => getGroupMembers(groupId),
    enabled: Number.isFinite(groupId),
  });
  const members = membersQuery.data ?? [];

  const dragFrom = useRef<number | null>(null);
  const dirty = useRef(false);

  // 일정 + 여행 기간을 한 키로 관리. SCHEDULE_*/VOTE_CLOSED SSE 이벤트가 이 키를 무효화한다.
  const scheduleQuery = useQuery({
    queryKey: groupQueryKeys.schedules(groupId),
    queryFn: async () => {
      const [sch, g, accs] = await Promise.all([
        getSchedules(groupId),
        getGroup(groupId),
        getAccommodations(groupId).catch(() => [] as Accommodation[]),
      ]);
      return { schedules: sch, tripDates: enumerateDates(g.startDate, g.endDate), accommodations: accs };
    },
    enabled: Number.isFinite(groupId),
  });
  const schedules = scheduleQuery.data?.schedules ?? [];
  const tripDates = scheduleQuery.data?.tripDates ?? [];
  const accommodations = scheduleQuery.data?.accommodations ?? [];
  const loading = scheduleQuery.isLoading;
  const error = scheduleQuery.isError;
  const load = () => scheduleQuery.refetch();

  // 드래그 등 낙관적 변경은 캐시(schedules)를 직접 갱신한다. tripDates는 보존.
  const setSchedulesData = (next: Schedule[]) =>
    queryClient.setQueryData<{ schedules: Schedule[]; tripDates: string[]; accommodations: Accommodation[] }>(
      groupQueryKeys.schedules(groupId),
      (old) => (old ? { ...old, schedules: next } : old),
    );

  // 일자 탭: 여행 기간의 모든 날짜(일정 없는 날도 포함). 미로딩 시 일정 날짜로 폴백.
  const dates = tripDates.length
    ? tripDates
    : [...new Set(schedules.map((s) => s.scheduleDate))].sort();
  const activeDate = dates[Math.min(activeIdx, Math.max(0, dates.length - 1))];
  const stops = schedules
    .filter((s) => s.scheduleDate === activeDate)
    .sort((a, b) => a.orderIndex - b.orderIndex);
  // 이 날(activeDate) 묵는 숙소 — stayDate~stayEndDate 범위에 포함되면 상단에 따로 표시.
  const stayHere = accommodations.find(
    (a) => a.stayDate != null && activeDate >= a.stayDate && activeDate <= (a.stayEndDate ?? a.stayDate),
  );

  // 인접 일정쌍 이동 카드 조회 — 각 쌍의 선택된 수단(기본 CAR)을 조회한다.
  // legMode가 바뀌면(탭 클릭) 재실행돼 해당 수단을 가져온다.
  useEffect(() => {
    let cancelled = false;
    for (let i = 0; i < stops.length - 1; i += 1) {
      // 빈 일정(장소 미정)은 좌표가 없어 이동 계산 불가 → 건너뛴다.
      if (!stops[i].placeId || !stops[i + 1].placeId) continue;
      const pairKey = `${stops[i].id}-${stops[i + 1].id}`;
      const mode = legMode[pairKey] ?? 'CAR';
      if (mode === 'TRANSIT') continue; // 대중교통은 네이버 지도로 핸드오프 → 레그 조회 불필요
      const key = `${pairKey}:${mode}`;
      if (legs[key] !== undefined) continue;
      // 이동 정보 지연 로딩(외부 fetch 트리거) — 동기 setState 경고는 의도된 패턴이라 무시.
      // eslint-disable-next-line react-hooks/set-state-in-effect
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
    setSchedulesData([...others, ...next.map((s, i) => ({ ...s, orderIndex: i }))]);
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

    // 새 순서로 시간 재계산(직전 일정 종료 이후로 시작) → 변경분만 저장.
    const retimed = recomputeTimes(stops);
    const changed = retimed.filter(
      (s, i) => s.startTime !== stops[i].startTime || s.endTime !== stops[i].endTime,
    );
    setStops(retimed); // 낙관적 반영(순서 + 시간)

    const items: ReorderItem[] = retimed.map((s, i) => ({ scheduleId: s.id, scheduleDate: activeDate, orderIndex: i }));
    try {
      await reorderSchedules(groupId, items);
      await Promise.all(
        // 시간 외 필드는 백엔드 update가 전체 교체이므로 기존 값을 그대로 보존해 보낸다.
        changed.map((s) =>
          updateSchedule(groupId, s.id, {
            startTime: s.startTime,
            endTime: s.endTime,
            memo: s.memo ?? undefined,
            estimatedCost: s.estimatedCost ?? undefined,
            transportMode: s.transportMode ?? undefined,
            status: s.status ?? undefined,
          }),
        ),
      );
      setLegs({}); setLegMode({}); // 인접 변동 → 이동 카드 갱신
    } catch {
      toast.error('순서·시간 변경에 실패했어요', '다시 시도해 주세요.');
      load();
    }
  };

  // 예상 비용 편집 시작 — 기존 값/결제자(기본: 나)를 채운다.
  const openCostEdit = (stop: Schedule) => {
    setCostEditId(stop.id);
    setCostDraft(stop.estimatedCost != null ? String(stop.estimatedCost) : '');
    const me = members.find((m) => m.userId === currentUserId);
    setCostPayerId(me ? me.userId : (members[0]?.userId ?? null));
  };

  // 일정의 예상 비용 저장 — 결제자를 지정해 균등 분담 지출로 등록(정산 반영). 비우면 연동 지출 제거.
  const saveCost = async (stop: Schedule) => {
    const raw = costDraft.trim();
    const value = raw === '' ? null : Number(raw);
    if (value != null && (Number.isNaN(value) || value < 0)) {
      toast.warning('금액을 확인해주세요', '0 이상의 숫자를 입력해 주세요.');
      return;
    }
    if (value != null && value > 0 && costPayerId == null) {
      toast.warning('결제자를 선택해주세요', '예상 비용을 정산에 반영하려면 결제한 사람을 골라주세요.');
      return;
    }
    setCostSaving(true);
    try {
      await setScheduleCost(groupId, stop.id, { estimatedCost: value, payerId: costPayerId });
      setCostEditId(null);
      // 연동 지출이 생겼으니 정산/지출 요약도 갱신.
      queryClient.invalidateQueries({ queryKey: groupQueryKeys.expenses(groupId) });
      load();
    } catch {
      toast.error('비용 저장에 실패했어요', '잠시 후 다시 시도해 주세요.');
    } finally {
      setCostSaving(false);
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
      <div className="scrollbar-hide -mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
        {dates.map((d, i) => (
          <button key={d} type="button" aria-pressed={activeIdx === i} onClick={() => setActiveIdx(i)}
            className={cn('shrink-0 rounded-full border px-3.5 py-1.5 text-[13px] font-bold transition-colors',
              activeIdx === i ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-surface text-muted')}>
            {i + 1}일차 <span className="opacity-70">{d.slice(5).replace('-', '.')}</span>
          </button>
        ))}
      </div>

      {/* 우리 여행일정 지도에서 보기 — 일정 장소+숙소를 핀으로 */}
      <button
        type="button"
        onClick={() => navigate(`/groups/${groupId}/map`)}
        className="mt-3 flex w-full items-center gap-2.5 rounded-card border border-border bg-surface px-3.5 py-3 text-left active:scale-[0.99]"
      >
        <span className="flex size-9 shrink-0 items-center justify-center rounded-[10px] bg-[#FFF1E6] text-[#E8742E]">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path d="M9 3 3 5.5v15L9 18l6 3 6-2.5v-15L15 6 9 3Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
            <path d="M9 3v15M15 6v15" stroke="currentColor" strokeWidth="1.8" />
          </svg>
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[14px] font-extrabold text-foreground">우리 여행일정 지도에서 보기</span>
          <span className="block text-[12px] text-muted">일정 장소와 숙소를 지도에 핀으로 한눈에</span>
        </span>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
          <path d="M9 6l6 6-6 6" stroke="#E8742E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {/* 이 날 묵는 숙소 — 일정 목록과 별개로 상단에 고정 표시 */}
      {stayHere && (
        <div className="mt-4 flex items-center gap-3 rounded-card border border-[#FFCBA6] bg-surface p-3 shadow-sm">
          <div className="size-11 shrink-0 overflow-hidden rounded-[8px] bg-skeleton">
            {placePhotoSrc(stayHere.place.photoUrl)
              ? <img src={placePhotoSrc(stayHere.place.photoUrl)!} alt="" loading="lazy" className="h-full w-full object-cover" />
              : <span className="flex h-full w-full items-center justify-center text-[18px]">🏨</span>}
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-[11px] font-extrabold text-[#E8742E]">이 날 숙소</div>
            <div className="truncate text-[14px] font-extrabold text-foreground">{stayHere.place.name}</div>
            <div className="text-[11px] text-muted">
              {stayHere.status === 'BOOKED' ? '예약 완료' : '선정됨'}
              {stayHere.reservationPrice != null && ` · ${stayHere.reservationPrice.toLocaleString()}원`}
            </div>
          </div>
        </div>
      )}

      <div className="mt-4">
        {stops.length === 0 && (
          <p className="rounded-card border border-dashed border-border py-8 text-center text-[13px] text-muted">
            이 날은 아직 일정이 없어요. 아래 ‘+ 장소 추가’로 채워보세요.
          </p>
        )}
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
                    <div className="mt-0.5 flex items-center gap-2 text-[12px] text-muted">
                      <span>{stop.startTime}–{stop.endTime}</span>
                      {/* 네이버 지도에서 보기 — 장소 탭처럼 작은 버튼 */}
                      {stop.placeId && (
                        <a
                          href={naverPlaceUrl(stop.placeName ?? stop.title ?? '', null)}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          title="네이버 지도에서 사진·리뷰 보기"
                          className="inline-flex items-center gap-1 rounded-button px-1.5 py-0.5 text-[10px] font-bold text-[#03C75A] transition-colors hover:bg-[#E9F8EE]"
                        >
                          <span className="flex size-3 items-center justify-center rounded-[3px] bg-[#03C75A] text-[8px] font-black leading-none text-white">N</span>
                          지도
                        </a>
                      )}
                    </div>
                    {stop.memo && <div className="mt-1 text-[12px] text-muted">{stop.memo}</div>}
                    {/* 예상 비용 — 장소가 정해진 일정에서 인라인으로 수정 가능 */}
                    {stop.placeId && (
                      costEditId === stop.id ? (
                        <div className="mt-1.5 space-y-1.5">
                          <div className="flex items-center gap-1.5">
                            <input
                              type="number"
                              inputMode="numeric"
                              autoFocus
                              value={costDraft}
                              onChange={(e) => setCostDraft(e.target.value)}
                              onKeyDown={(e) => { if (e.key === 'Enter') void saveCost(stop); if (e.key === 'Escape') setCostEditId(null); }}
                              placeholder="예상 비용(원)"
                              className="w-32 rounded-button border border-border bg-background px-2 py-1 text-[12px] text-foreground"
                            />
                            <select
                              value={costPayerId ?? ''}
                              onChange={(e) => setCostPayerId(e.target.value ? Number(e.target.value) : null)}
                              className="max-w-[7rem] rounded-button border border-border bg-background px-2 py-1 text-[12px] text-foreground"
                              aria-label="결제자"
                            >
                              {members.map((m) => (
                                <option key={m.userId} value={m.userId}>
                                  {m.userId === currentUserId ? '내가 결제' : `${m.name} 결제`}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <button type="button" disabled={costSaving} onClick={() => saveCost(stop)}
                              className="rounded-button bg-primary px-2.5 py-1 text-[12px] font-bold text-primary-foreground disabled:opacity-60">저장</button>
                            <button type="button" onClick={() => setCostEditId(null)}
                              className="rounded-button border border-border px-2.5 py-1 text-[12px] font-bold text-muted">취소</button>
                            <span className="text-[11px] text-muted">균등 분담으로 정산에 반영돼요</span>
                          </div>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => openCostEdit(stop)}
                          className="mt-1.5 inline-flex items-center gap-1 text-[12px] font-bold text-muted hover:text-[#E8742E]"
                        >
                          <span className="text-[#A6907B]">예상 비용</span>
                          <span className="text-foreground">{stop.estimatedCost != null ? formatCost(stop.estimatedCost) : '추가'}</span>
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden>
                            <path d="M4 20h4L18.5 9.5a2 2 0 0 0-2.8-2.8L4 18v2Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
                          </svg>
                        </button>
                      )
                    )}
                    {/* 빈 일정: 투표로 정하기 / (Owner) 직접 정하기 */}
                    {!stop.placeId && (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        <button
                          type="button"
                          onClick={() => goVote(stop)}
                          className="inline-flex items-center gap-1 rounded-button bg-[#FFF1E6] px-2.5 py-1 text-[12px] font-bold text-[#E8742E]"
                        >
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden>
                            <path d="M9 11l3 3L22 4M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                          {stop.status === 'VOTING' ? '투표 보기' : '투표로 정하기'}
                        </button>
                        {isOwner && stop.status !== 'VOTING' && (
                          <button
                            type="button"
                            onClick={() => setPickFor(stop)}
                            className="inline-flex items-center gap-1 rounded-button border border-border bg-surface px-2.5 py-1 text-[12px] font-bold text-muted"
                          >
                            직접 정하기
                          </button>
                        )}
                      </div>
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
                from={stop}
                to={stops[i + 1]}
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
          defaultStart={stops.length ? stops[stops.length - 1].endTime : undefined}
          onClose={() => setAddOpen(false)}
          onAdded={() => { setLegs({}); load(); }}
        />
      )}

      {pickFor && (
        <PlacePickerModal
          groupId={groupId}
          title="장소 직접 정하기"
          description="이 빈 일정의 장소를 투표 없이 바로 확정해요."
          onClose={() => setPickFor(null)}
          onPick={async (placeId) => {
            try {
              await setSchedulePlace(groupId, pickFor.id, placeId);
              toast.success('장소를 확정했어요');
              setPickFor(null);
              setLegs({});
              load();
            } catch (e) {
              const message = (e as { response?: { data?: { message?: string } } })?.response?.data?.message;
              toast.error('확정하지 못했어요', message ?? '잠시 후 다시 시도해 주세요.');
            }
          }}
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

// 대중교통은 카카오 공개 API 미지원 → 네이버 지도 대중교통 길찾기로 핸드오프한다.
function naverTransitUrl(from: Schedule, to: Schedule): string {
  const s = `${from.placeLng},${from.placeLat},${encodeURIComponent(from.placeName ?? '출발')}`;
  const e = `${to.placeLng},${to.placeLat},${encodeURIComponent(to.placeName ?? '도착')}`;
  return `https://map.naver.com/p/directions/${s}/${e}/-/transit`;
}

/** 이동 카드 — 자동차/대중교통/도보 3개 탭(FR-SCHEDULE-04). 대중교통은 네이버 지도로 이동. */
function TransportRow({ mode, leg, from, to, onSelect }: {
  mode: TransportMode; leg: LegState; from: Schedule; to: Schedule; onSelect: (m: TransportMode) => void;
}) {
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
              mode === m ? 'bg-primary text-primary-foreground' : 'border border-border bg-surface text-muted',
            )}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path d={MODE_PATH[m]} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            {TRANSPORT_META[m].label}
          </button>
        ))}
      </div>
      {mode === 'TRANSIT' ? (
        <button
          type="button"
          onClick={() => window.open(naverTransitUrl(from, to), '_blank', 'noopener,noreferrer')}
          className="mt-1 inline-flex items-center gap-1 text-[12px] font-bold text-[#03C75A]"
        >
          네이버 지도에서 대중교통 길찾기 ↗
        </button>
      ) : (
        <TransportInfo leg={leg} />
      )}
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
