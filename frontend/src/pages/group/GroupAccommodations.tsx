import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAccommodations } from '../../api/accommodation';
import { placePhotoSrc } from '../../api/place';
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
  if (!a.stayDate) return '숙소';
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
  const [accs, setAccs] = useState<Accommodation[] | null>(null);

  useEffect(() => {
    let active = true;
    getAccommodations(groupId)
      .then((a) => { if (active) setAccs(a); })
      .catch(() => { if (active) setAccs([]); });
    return () => { active = false; };
  }, [groupId]);

  if (!accs || accs.length === 0) return null;

  // 같은 시작일은 가장 최근 것만(목록은 최근순).
  const byStart = new Map<string, Accommodation>();
  for (const a of accs) {
    const key = a.stayDate ?? 'none';
    if (!byStart.has(key)) byStart.set(key, a);
  }
  const items = [...byStart.values()].sort((x, y) => (x.stayDate ?? '').localeCompare(y.stayDate ?? ''));

  // 아직 숙소가 없는 박 계산(여행 기간이 있을 때).
  let missing: string[] = [];
  if (startDate && endDate) {
    const covered = new Set<string>();
    for (const a of accs) {
      if (a.stayDate) for (const d of datesInclusive(a.stayDate, a.stayEndDate ?? a.stayDate)) covered.add(d);
    }
    missing = tripNights(startDate, endDate).filter((n) => !covered.has(n));
  }

  return (
    <div className="border-b border-border bg-surface px-4 py-3">
      <p className="mb-2 text-[12px] font-extrabold text-muted">우리 숙소</p>
      <div className="-mx-4 flex gap-2 overflow-x-auto px-4">
        {items.map((a) => {
          const src = placePhotoSrc(a.place.photoUrl);
          return (
            <div key={a.id} className="flex w-44 shrink-0 items-center gap-2 rounded-card border border-border bg-background p-2">
              <div className="size-11 shrink-0 overflow-hidden rounded-[8px] bg-skeleton">
                {src && <img src={src} alt="" loading="lazy" className="h-full w-full object-cover" />}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-[11px] font-bold text-primary">{rangeLabel(a)}</div>
                <div className="truncate text-[13px] font-bold text-foreground">{a.place.name}</div>
                <div className="text-[10px] text-muted">{a.status === 'BOOKED' ? '예약 완료' : '선정됨'}</div>
              </div>
            </div>
          );
        })}
      </div>
      {missing.length > 0 && (
        <button
          type="button"
          onClick={() => navigate(`/groups/${groupId}/plan`)}
          className="mt-2 text-[12px] font-bold text-[#E8742E]"
        >
          아직 숙소 미선택: {missing.map(shortDate).join(', ')} · 숙소 정하기 →
        </button>
      )}
    </div>
  );
}
