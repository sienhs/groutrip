import { useEffect, useState } from 'react';
import { getAccommodations } from '../../api/accommodation';
import { placePhotoSrc } from '../../api/place';
import type { Accommodation } from '../../types/accommodation';

/** 'YYYY-MM-DD' → 'M/D'. */
function shortDate(d: string): string {
  const [, m, day] = d.split('-');
  return `${Number(m)}/${Number(day)}`;
}

/**
 * 그룹 페이지 상단의 "우리 숙소" 요약 — 날짜별로 선정/예약된 숙소를 보여준다.
 * 같은 날짜에 여러 번 선택했으면 가장 최근 것만 표시한다(목록은 최근순).
 */
export default function GroupAccommodations({ groupId }: { groupId: number }) {
  const [accs, setAccs] = useState<Accommodation[] | null>(null);

  useEffect(() => {
    let active = true;
    getAccommodations(groupId)
      .then((a) => { if (active) setAccs(a); })
      .catch(() => { if (active) setAccs([]); });
    return () => { active = false; };
  }, [groupId]);

  if (!accs || accs.length === 0) return null;

  const byDate = new Map<string, Accommodation>();
  for (const a of accs) {
    const key = a.stayDate ?? 'none';
    if (!byDate.has(key)) byDate.set(key, a); // 최근순이라 첫 항목이 최신
  }
  const items = [...byDate.entries()].sort((x, y) => x[0].localeCompare(y[0]));

  return (
    <div className="border-b border-border bg-surface px-4 py-3">
      <p className="mb-2 text-[12px] font-extrabold text-muted">우리 숙소</p>
      <div className="-mx-4 flex gap-2 overflow-x-auto px-4">
        {items.map(([key, a]) => {
          const src = placePhotoSrc(a.place.photoUrl);
          return (
            <div key={key} className="flex w-44 shrink-0 items-center gap-2 rounded-card border border-border bg-background p-2">
              <div className="size-11 shrink-0 overflow-hidden rounded-[8px] bg-skeleton">
                {src && <img src={src} alt="" loading="lazy" className="h-full w-full object-cover" />}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-[11px] font-bold text-primary">{key === 'none' ? '숙소' : `${shortDate(key)} 숙박`}</div>
                <div className="truncate text-[13px] font-bold text-foreground">{a.place.name}</div>
                <div className="text-[10px] text-muted">{a.status === 'BOOKED' ? '예약 완료' : '선정됨'}</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
