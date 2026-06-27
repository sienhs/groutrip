import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getAccommodations, deleteAccommodation } from '../../api/accommodation';
import { placePhotoSrc } from '../../api/place';
import { groupQueryKeys } from '../../queryKeys/groupQueryKeys';
import { cn } from '../../lib/cn';
import type { Accommodation } from '../../types/accommodation';

/** 'YYYY-MM-DD' → 'M/D'. */
function shortDate(d: string): string {
  const [, m, day] = d.split('-');
  return `${Number(m)}/${Number(day)}`;
}

/** 숙박일 목록(체크인~체크아웃 전날). */
function tripNights(start: string, end: string): string[] {
  const res: string[] = [];
  const s = new Date(start + 'T00:00:00');
  const e = new Date(end + 'T00:00:00');
  for (let d = new Date(s); d < e; d.setDate(d.getDate() + 1)) {
    res.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`);
  }
  return res.length ? res : [start];
}

function datesInclusive(start: string, end: string): string[] {
  const res: string[] = [];
  const s = new Date(start + 'T00:00:00');
  const e = new Date(end + 'T00:00:00');
  for (let d = new Date(s); d <= e; d.setDate(d.getDate() + 1)) {
    res.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`);
  }
  return res;
}

function rangeLabel(a: Accommodation): string {
  if (!a.stayDate) return '날짜 미정';
  const end = a.stayEndDate ?? a.stayDate;
  return end !== a.stayDate ? `${shortDate(a.stayDate)}~${shortDate(end)}` : `${shortDate(a.stayDate)} 숙박`;
}

/**
 * 그룹 페이지 상단의 "우리 숙소" 요약 — 날짜(기간)별로 선정/예약된 숙소를 보여주고,
 * 아직 숙소가 없는 날짜는 '미선택'으로 안내한다.
 */
export default function GroupAccommodations({
  groupId,
  startDate,
  endDate,
}: {
  groupId: number;
  startDate?: string;
  endDate?: string;
}) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: accs } = useQuery({
    queryKey: groupQueryKeys.accommodations(groupId),
    queryFn: () => getAccommodations(groupId),
  });
  const deleteMut = useMutation({
    mutationFn: (id: number) => deleteAccommodation(groupId, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: groupQueryKeys.accommodations(groupId) });
      queryClient.invalidateQueries({ queryKey: groupQueryKeys.plan(groupId) });
      queryClient.invalidateQueries({ queryKey: groupQueryKeys.schedules(groupId) });
    },
  });

  if (!accs) return null; // 로딩 중

  // 같은 시작일은 가장 최근 것만(목록은 최근순). 날짜 미정(stayDate=null)은 각각 따로 보여준다.
  const byStart = new Map<string, Accommodation>();
  const undated: Accommodation[] = [];
  for (const a of accs) {
    if (!a.stayDate) { undated.push(a); continue; }
    if (!byStart.has(a.stayDate)) byStart.set(a.stayDate, a);
  }
  const items = [
    ...[...byStart.values()].sort((x, y) => (x.stayDate ?? '').localeCompare(y.stayDate ?? '')),
    ...undated,
  ];

  // 아직 숙소가 없는 박 계산(여행 기간이 있을 때). 날짜 미정 숙소는 어떤 박도 커버하지 않는다.
  let missing: string[] = [];
  if (startDate && endDate) {
    const covered = new Set<string>();
    for (const a of accs) {
      if (a.stayDate) for (const d of datesInclusive(a.stayDate, a.stayEndDate ?? a.stayDate)) covered.add(d);
    }
    missing = tripNights(startDate, endDate).filter((n) => !covered.has(n));
  }

  // 숙소가 하나도 없으면 그룹 홈의 큰 '여행 계획 시작하기' CTA가 그 역할을 하므로 여기선 렌더 안 함.
  if (items.length === 0) return null;

  return (
    <div className="border-b border-border bg-surface px-4 py-3">
      <p className="mb-2 text-[12px] font-extrabold text-muted">우리 숙소</p>
      {items.length > 0 && (
        <div className="scrollbar-hide -mx-4 flex gap-2 overflow-x-auto px-4">
          {items.map((a) => {
            const src = placePhotoSrc(a.place.photoUrl);
            const noDate = !a.stayDate;
            return (
              <div key={a.id} className="relative flex w-44 shrink-0 items-center gap-2 rounded-card border border-border bg-background p-2">
                <div className="size-11 shrink-0 overflow-hidden rounded-[8px] bg-skeleton">
                  {src && <img src={src} alt="" loading="lazy" className="h-full w-full object-cover" />}
                </div>
                <div className="min-w-0 flex-1">
                  <div className={cn('text-[11px] font-bold', noDate ? 'text-[#C25478]' : 'text-primary')}>{rangeLabel(a)}</div>
                  <div className="truncate text-[13px] font-bold text-foreground">{a.place.name}</div>
                  {noDate ? (
                    <button
                      type="button"
                      onClick={() => navigate(`/groups/${groupId}/plan`)}
                      className="text-[10px] font-bold text-[#C25478] underline-offset-2 hover:underline"
                    >
                      날짜 정하기 →
                    </button>
                  ) : (
                    <div className="text-[10px] text-muted">{a.status === 'BOOKED' ? '예약 완료' : '선정됨'}</div>
                  )}
                </div>
                <button
                  type="button"
                  aria-label="숙소 제거"
                  onClick={() => deleteMut.mutate(a.id)}
                  disabled={deleteMut.isPending}
                  className="absolute right-1 top-1 flex size-5 items-center justify-center rounded-full bg-black/20 text-white hover:bg-black/40 disabled:opacity-40"
                >
                  <svg width="10" height="10" viewBox="0 0 12 12" fill="none" aria-hidden>
                    <path d="M2 2l8 8M10 2l-8 8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                  </svg>
                </button>
              </div>
            );
          })}
        </div>
      )}
      {missing.length > 0 && (
        <button
          type="button"
          onClick={() => navigate(`/groups/${groupId}/plan`)}
          className="mt-2 text-[12px] font-bold text-[#C25478]"
        >
          아직 숙소 미선택: {missing.map(shortDate).join(', ')} · 숙소 정하기 →
        </button>
      )}
    </div>
  );
}
