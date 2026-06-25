/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import AppLayout from '../../components/AppLayout';
import EmptyState from '../../components/EmptyState';
import Button from '../../components/Button';
import { getSchedules, getTransportLeg } from '../../api/schedule';
import { getGroup } from '../../api/group';
import { getAccommodations } from '../../api/accommodation';
import { groupQueryKeys } from '../../queryKeys/groupQueryKeys';
import { loadKakaoMaps, KAKAO_MAP_KEY } from '../../lib/kakaoMap';
import { naverPlaceUrl } from '../../lib/naver';
import { cn } from '../../lib/cn';
import { formatDuration, formatKm, type Schedule } from '../../types/schedule';
import type { Accommodation, BookingStatus } from '../../types/accommodation';

// 일자별 핀·경로 색(반복).
const DAY_COLORS = ['#E8742E', '#3182F6', '#22C55E', '#A855F7', '#EC4899', '#F59E0B', '#06B6D4', '#EF4444'];

const addDay = (ymd: string): string => {
  const d = new Date(`${ymd}T12:00:00`);
  d.setDate(d.getDate() + 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
const enumerateDates = (start: string, end: string): string[] => {
  const out: string[] = [];
  let cur = start;
  for (let i = 0; cur <= end && i < 60; i += 1) {
    out.push(cur);
    cur = addDay(cur);
  }
  return out;
};
const shortDate = (d: string): string => d.slice(5).replace('-', '.');
const won = (n: number): string => `${n.toLocaleString('ko-KR')}원`;

/**
 * 순서대로 이어진 좌표들을 살짝 휜 곡선(구간별 2차 베지어)으로 샘플링해 kakao LatLng 배열로 만든다.
 * 실제 도로가 아니라 "이동 흐름"을 보여주는 용도라, 직선의 날카로운 꺾임을 부드럽게 만든다.
 */
function curvedLatLngs(kakao: any, pts: [number, number][]): any[] {
  if (pts.length < 2) return pts.map(([la, ln]) => new kakao.maps.LatLng(la, ln));
  const BEND = 0.14; // 휘는 정도(구간 길이 대비). 클수록 더 둥글게.
  const STEPS = 18;
  const out: any[] = [];
  for (let i = 0; i < pts.length - 1; i += 1) {
    const [aLat, aLng] = pts[i];
    const [bLat, bLng] = pts[i + 1];
    // 중점을 진행 방향의 수직으로 살짝 밀어 제어점을 만든다(서울권에선 위경도 왜곡 무시 가능).
    const cLat = (aLat + bLat) / 2 - (bLng - aLng) * BEND;
    const cLng = (aLng + bLng) / 2 + (bLat - aLat) * BEND;
    for (let s = i === 0 ? 0 : 1; s <= STEPS; s += 1) {
      const t = s / STEPS;
      const u = 1 - t;
      const lat = u * u * aLat + 2 * u * t * cLat + t * t * bLat;
      const lng = u * u * aLng + 2 * u * t * cLng + t * t * bLng;
      out.push(new kakao.maps.LatLng(lat, lng));
    }
  }
  return out;
}

/** 지도에 찍을 핀 한 개. */
interface Pin {
  lat: number;
  lng: number;
  name: string;
  order: number | null; // 일정 순번(1부터). 숙소면 null.
  isStay: boolean;
  dayIdx: number; // 색 인덱스. 숙소(날짜 없음)는 -1.
  date: string | null;
  address: string | null;
  // 일정
  startTime?: string;
  endTime?: string;
  // 숙소
  status?: BookingStatus;
  reservationPrice?: number | null;
  stayDate?: string | null;
  stayEndDate?: string | null;
}

/** 하루 안에서 인접한 두 일정을 잇는 이동 구간. */
interface Leg {
  key: string;
  dayIdx: number;
  fromId: number;
  toId: number;
  from: [number, number];
  to: [number, number];
}

/**
 * 우리 여행일정 지도 — 일정에 들어간 장소(숙소 포함)만 핀으로 표시한다.
 * 보관함 전체(투표용 임시 후보 포함)는 표시하지 않는다(일정에 확정된 것만).
 * 일자별로 색을 달리해 이동 흐름을 선으로 잇고(가능하면 카카오 자동차 도로 경로, 실패 시 직선),
 * 핀을 누르면 상세(숙소는 예약/머무는 기간)를 보여준다. Kakao Maps JS SDK 사용.
 */
export default function ScheduleMapPage() {
  const params = useParams<{ id: string }>();
  const groupId = Number(params.id);

  const mapEl = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const overlaysRef = useRef<any[]>([]);
  const polylinesRef = useRef<any[]>([]);
  const [sdkError, setSdkError] = useState<string | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const [activeDay, setActiveDay] = useState<number>(-1); // -1 = 전체
  const [selected, setSelected] = useState<Pin | null>(null);
  // 자차 이동 정보 캐시: legKey → {분, 미터} 또는 'error'(조회 실패). 종합 거리·시간 합산에 사용.
  const [legInfo, setLegInfo] = useState<Record<string, { dur: number; dist: number } | 'error'>>({});

  // 핀 클릭 핸들러는 최신 참조를 ref로 유지(오버레이 재생성과 무관하게).
  const onPinClickRef = useRef<(p: Pin) => void>(() => {});
  useEffect(() => { onPinClickRef.current = (p: Pin) => setSelected(p); });

  const dataQuery = useQuery({
    queryKey: [...groupQueryKeys.schedules(groupId), 'map'] as const,
    queryFn: async () => {
      const [sch, g, accs] = await Promise.all([
        getSchedules(groupId),
        getGroup(groupId),
        getAccommodations(groupId).catch(() => [] as Accommodation[]),
      ]);
      return { schedules: sch, dates: enumerateDates(g.startDate, g.endDate), accommodations: accs };
    },
    enabled: Number.isFinite(groupId),
  });

  const dates = useMemo(() => dataQuery.data?.dates ?? [], [dataQuery.data]);

  // 일정 장소(좌표 있는 것) + 숙소 → 핀 목록.
  const pins = useMemo<Pin[]>(() => {
    if (!dataQuery.data) return [];
    const { schedules, accommodations } = dataQuery.data;
    const dayOf = (date: string) => Math.max(0, dates.indexOf(date));

    const out: Pin[] = [];
    const byDate = new Map<string, Schedule[]>();
    for (const s of schedules) {
      if (s.placeId == null || s.placeLat == null || s.placeLng == null) continue;
      const arr = byDate.get(s.scheduleDate) ?? [];
      arr.push(s);
      byDate.set(s.scheduleDate, arr);
    }
    for (const [date, list] of byDate) {
      list.sort((a, b) => a.orderIndex - b.orderIndex);
      list.forEach((s, i) => {
        out.push({
          lat: s.placeLat!, lng: s.placeLng!, name: s.placeName ?? s.title ?? '장소',
          order: i + 1, isStay: false, dayIdx: dayOf(date), date, address: null,
          startTime: s.startTime, endTime: s.endTime,
        });
      });
    }
    for (const a of accommodations) {
      const p = a.place;
      if (p.latitude == null || p.longitude == null) continue;
      // 숙소 순번: 그 날 일정들 다음 번호(예: 일정 3개면 숙소는 4). 날짜 미정이면 번호 없음.
      const stayOrder = a.stayDate ? (byDate.get(a.stayDate)?.length ?? 0) + 1 : null;
      out.push({
        lat: p.latitude, lng: p.longitude, name: p.name,
        order: stayOrder, isStay: true,
        dayIdx: a.stayDate ? dayOf(a.stayDate) : -1,
        date: a.stayDate, address: p.address,
        status: a.status, reservationPrice: a.reservationPrice,
        stayDate: a.stayDate, stayEndDate: a.stayEndDate,
      });
    }
    return out;
  }, [dataQuery.data, dates]);

  // 하루 안 인접 일정쌍 → 이동 구간(숙소 제외, 일정 순서대로).
  const legs = useMemo<Leg[]>(() => {
    if (!dataQuery.data) return [];
    const dayOf = (date: string) => Math.max(0, dates.indexOf(date));
    const byDate = new Map<string, Schedule[]>();
    for (const s of dataQuery.data.schedules) {
      if (s.placeId == null || s.placeLat == null || s.placeLng == null) continue;
      const arr = byDate.get(s.scheduleDate) ?? [];
      arr.push(s);
      byDate.set(s.scheduleDate, arr);
    }
    const out: Leg[] = [];
    for (const [date, list] of byDate) {
      list.sort((a, b) => a.orderIndex - b.orderIndex);
      for (let i = 0; i < list.length - 1; i += 1) {
        const f = list[i];
        const t = list[i + 1];
        out.push({
          key: `${f.id}-${t.id}`, dayIdx: dayOf(date),
          fromId: f.id, toId: t.id,
          from: [f.placeLat!, f.placeLng!], to: [t.placeLat!, t.placeLng!],
        });
      }
    }
    return out;
  }, [dataQuery.data, dates]);

  const visiblePins = useMemo(
    () => (activeDay < 0 ? pins : pins.filter((p) => p.dayIdx === activeDay)),
    [pins, activeDay],
  );
  const visibleLegs = useMemo(
    () => (activeDay < 0 ? legs : legs.filter((l) => l.dayIdx === activeDay)),
    [legs, activeDay],
  );

  // 지도 초기화(한 번).
  useEffect(() => {
    if (!dataQuery.data || pins.length === 0 || !mapEl.current || mapRef.current) return;
    let cancelled = false;
    loadKakaoMaps()
      .then((kakao) => {
        if (cancelled || !mapEl.current) return;
        const first = pins[0];
        mapRef.current = new kakao.maps.Map(mapEl.current, {
          center: new kakao.maps.LatLng(first.lat, first.lng),
          level: 7,
        });
        setMapReady(true);
      })
      .catch((e) => { if (!cancelled) setSdkError(e?.message ?? '지도를 불러오지 못했어요'); });
    return () => { cancelled = true; };
  }, [dataQuery.data, pins]);

  // 보이는 이동 구간의 자차 이동 시간·거리를 비동기로 가져온다(종합 거리/시간 합산용).
  useEffect(() => {
    let cancelled = false;
    for (const leg of visibleLegs) {
      if (legInfo[leg.key] !== undefined) continue;
      getTransportLeg(groupId, leg.fromId, leg.toId, 'CAR')
        .then((r) => {
          if (cancelled) return;
          setLegInfo((prev) => ({
            ...prev,
            [leg.key]: r.available && r.durationMinutes != null && r.distanceMeters != null
              ? { dur: r.durationMinutes, dist: r.distanceMeters }
              : 'error',
          }));
        })
        .catch(() => { if (!cancelled) setLegInfo((prev) => ({ ...prev, [leg.key]: 'error' })); });
    }
    return () => { cancelled = true; };
  }, [visibleLegs, legInfo, groupId]);

  // 이동 흐름 선 그리기 — 실제 도로 경로 대신 흐름만 표시한다.
  // 하루치 구간을 하나의 연속 경로로 잇고, 직선 대신 살짝 휜 곡선으로 그려
  // (멀리 떨어진 장소 사이에서 생기던 날카로운 꺾임을 부드럽게) 시연하기 좋게 보여준다.
  useEffect(() => {
    const kakao = (window as any).kakao;
    const map = mapRef.current;
    if (!kakao?.maps || !map) return;
    polylinesRef.current.forEach((p) => p.setMap(null));
    polylinesRef.current = [];

    // 같은 일자의 구간들을 순서대로 하나의 점 배열로 연결한다(leg.to === 다음 leg.from).
    const ordered = new Map<number, [number, number][]>();
    for (const leg of visibleLegs) {
      const arr = ordered.get(leg.dayIdx) ?? [];
      if (arr.length === 0) arr.push(leg.from);
      arr.push(leg.to);
      ordered.set(leg.dayIdx, arr);
    }

    for (const [dayIdx, pts] of ordered) {
      const color = dayIdx >= 0 ? DAY_COLORS[dayIdx % DAY_COLORS.length] : '#8A7B6B';
      const polyline = new kakao.maps.Polyline({
        path: curvedLatLngs(kakao, pts),
        strokeWeight: 5,
        strokeColor: color,
        strokeOpacity: 0.85,
        strokeStyle: 'solid',
      });
      polyline.setMap(map);
      polylinesRef.current.push(polyline);
    }
  }, [visibleLegs, mapReady]);

  // 종합 이동(자차): 보이는 구간 합산. resolved=조회완료(성공+실패), known=성공.
  const carTotals = useMemo(() => {
    let dur = 0;
    let dist = 0;
    let known = 0;
    let resolved = 0;
    for (const leg of visibleLegs) {
      const info = legInfo[leg.key];
      if (info === undefined) continue;
      resolved += 1;
      if (info !== 'error') {
        dur += info.dur;
        dist += info.dist;
        known += 1;
      }
    }
    return { dur, dist, known, total: visibleLegs.length, pending: resolved < visibleLegs.length };
  }, [visibleLegs, legInfo]);

  // 핀(오버레이) 그리기 — 필터/데이터 변경 시. 클릭하면 상세 카드.
  useEffect(() => {
    const kakao = (window as any).kakao;
    const map = mapRef.current;
    if (!kakao?.maps || !map) return;
    overlaysRef.current.forEach((o) => o.setMap(null));
    overlaysRef.current = [];

    if (visiblePins.length === 0) return;
    const bounds = new kakao.maps.LatLngBounds();
    for (const pin of visiblePins) {
      const pos = new kakao.maps.LatLng(pin.lat, pin.lng);
      bounds.extend(pos);
      const el = buildPinEl(pin);
      el.addEventListener('click', () => onPinClickRef.current(pin));
      const overlay = new kakao.maps.CustomOverlay({ position: pos, content: el, yAnchor: 1, zIndex: pin.isStay ? 6 : 3 });
      overlay.setMap(map);
      overlaysRef.current.push(overlay);
    }
    if (visiblePins.length === 1) {
      map.setCenter(bounds.getSouthWest());
      map.setLevel(5);
    } else {
      map.setBounds(bounds);
    }
  }, [visiblePins, mapReady]);

  const loading = dataQuery.isLoading;
  const noKey = !KAKAO_MAP_KEY;

  return (
    <AppLayout title="여행 일정 지도" showBack hideBottomNav>
      {loading ? (
        <p className="py-16 text-center text-[13px] text-muted">불러오는 중…</p>
      ) : dataQuery.isError ? (
        <EmptyState title="불러오지 못했어요" description="잠시 후 다시 시도해 주세요."
          action={<Button variant="secondary" onClick={() => dataQuery.refetch()}>다시 시도</Button>} />
      ) : pins.length === 0 ? (
        <EmptyState title="지도에 표시할 장소가 없어요" description="일정에 장소를 추가하거나 숙소를 정하면 지도에 핀으로 보여드려요." />
      ) : (
        <div className="space-y-3">
          {/* 일자 필터 */}
          <div className="scrollbar-hide -mx-4 flex gap-2 overflow-x-auto px-4">
            <DayChip label="전체" active={activeDay === -1} onClick={() => setActiveDay(-1)} />
            {dates.map((d, i) => (
              <DayChip
                key={d}
                label={`${i + 1}일차`}
                color={DAY_COLORS[i % DAY_COLORS.length]}
                active={activeDay === i}
                onClick={() => setActiveDay(i)}
              />
            ))}
          </div>

          {noKey || sdkError ? (
            <MapFallback pins={visiblePins} message={sdkError ?? '지도 키(VITE_KAKAO_MAP_KEY)가 설정되지 않았어요.'} />
          ) : (
            <>
              <div className="relative">
                <div ref={mapEl} className="h-[60vh] w-full overflow-hidden rounded-card border border-border bg-skeleton" />
                {selected && <DetailCard pin={selected} onClose={() => setSelected(null)} />}
              </div>

              {/* 종합 이동(자차/대중교통) — 선택한 일자 또는 전체 합산 */}
              <TravelTotals
                scope={activeDay < 0 ? '전체 일정' : `${activeDay + 1}일차`}
                legCount={visibleLegs.length}
                car={carTotals}
              />

              {/* 범례 */}
              <div className="flex items-center gap-3 px-1 text-[11px] text-muted">
                <span className="inline-flex items-center gap-1"><span className="size-3 rounded-full border-2 border-white bg-[#E8742E] shadow" />일정(순번)</span>
                <span className="inline-flex items-center gap-1"><StayGlyph small />숙소</span>
                <span className="inline-flex items-center gap-1"><span className="h-0.5 w-4 bg-[#3182F6]" />이동 경로</span>
              </div>
              <p className="text-center text-[12px] text-[#BCA48C]">
                일정에 들어간 장소와 숙소만 표시돼요(보관함 전체는 제외) · 핀을 누르면 상세가 보여요.
              </p>
            </>
          )}
        </div>
      )}
    </AppLayout>
  );
}

/** 핀 DOM 요소 — 일정은 색 원형+순번, 숙소는 둥근 사각+침대 아이콘+'숙소' 라벨(이모지 미사용). */
function buildPinEl(pin: Pin): HTMLDivElement {
  const color = pin.dayIdx >= 0 ? DAY_COLORS[pin.dayIdx % DAY_COLORS.length] : '#8A7B6B';
  const safeName = pin.name.replace(/</g, '&lt;');
  const el = document.createElement('div');
  el.style.cssText = 'transform:translate(-50%,-100%);cursor:pointer;';
  if (pin.isStay) {
    // 숙소: 둥근 사각 마커(일정 원형과 형태로 구분) + 순번 + 우상단 침대 배지(숙소 표시, 이모지 미사용).
    const inner = pin.order != null
      ? `<span style="font-size:13px;font-weight:800;color:#fff;">${pin.order}</span>`
      : `<svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M3 8v9M3 13h16a2 2 0 0 1 2 2v2M3 13V9a1 1 0 0 1 1-1h7a3 3 0 0 1 3 3v2" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
    el.innerHTML = `
      <div style="display:flex;flex-direction:column;align-items:center;">
        <div style="position:relative;display:flex;align-items:center;justify-content:center;width:30px;height:30px;border-radius:9px;
          background:${color};box-shadow:0 2px 6px rgba(0,0,0,.3);border:2.5px solid #fff;">
          ${inner}
          <span style="position:absolute;top:-7px;right:-7px;display:flex;align-items:center;justify-content:center;
            width:17px;height:17px;border-radius:50%;background:#fff;box-shadow:0 1px 2px rgba(0,0,0,.3);">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none"><path d="M3 8v9M3 13h16a2 2 0 0 1 2 2v2M3 13V9a1 1 0 0 1 1-1h7a3 3 0 0 1 3 3v2" stroke="${color}" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg>
          </span>
        </div>
        <div style="width:2px;height:7px;background:${color};"></div>
        <div style="display:flex;align-items:center;gap:3px;max-width:130px;margin-top:1px;padding:1px 6px;border-radius:6px;
          background:${color};color:#fff;font-size:11px;font-weight:800;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;
          box-shadow:0 1px 3px rgba(0,0,0,.22);">숙소 · ${safeName}</div>
      </div>`;
  } else {
    el.innerHTML = `
      <div style="display:flex;flex-direction:column;align-items:center;">
        <div style="display:flex;align-items:center;justify-content:center;min-width:28px;height:28px;padding:0 6px;
          border-radius:14px;background:${color};color:#fff;font-size:13px;font-weight:800;
          box-shadow:0 2px 6px rgba(0,0,0,.3);border:2px solid #fff;">${pin.order}</div>
        <div style="width:2px;height:8px;background:${color};"></div>
        <div style="max-width:120px;margin-top:1px;padding:1px 5px;border-radius:6px;background:rgba(255,255,255,.92);
          font-size:11px;font-weight:700;color:#3A2E22;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;
          box-shadow:0 1px 3px rgba(0,0,0,.18);">${safeName}</div>
      </div>`;
  }
  return el;
}

/** 범례용 숙소 글리프(SVG, 이모지 미사용). */
function StayGlyph({ small }: { small?: boolean }) {
  const s = small ? 14 : 16;
  return (
    <span
      className="inline-flex items-center justify-center rounded-[5px] border-2 border-white bg-[#E8742E] shadow"
      style={{ width: s, height: s }}
    >
      <svg width={s - 5} height={s - 5} viewBox="0 0 24 24" fill="none" aria-hidden>
        <path d="M3 8v9M3 13h16a2 2 0 0 1 2 2v2M3 13V9a1 1 0 0 1 1-1h7a3 3 0 0 1 3 3v2" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </span>
  );
}

/** 종합 이동 거리·시간 요약(자차 실측 합산 + 대중교통 안내). */
function TravelTotals({
  scope,
  legCount,
  car,
}: {
  scope: string;
  legCount: number;
  car: { dur: number; dist: number; known: number; total: number; pending: boolean };
}) {
  return (
    <div className="rounded-card border border-border bg-surface p-3.5">
      <div className="mb-2 flex items-center gap-1.5">
        <span className="text-[13px] font-extrabold text-foreground">종합 이동</span>
        <span className="text-[12px] text-muted">· {scope}</span>
        {legCount > 0 && <span className="ml-auto text-[11px] text-[#BCA48C]">{legCount}개 구간</span>}
      </div>

      {legCount === 0 ? (
        <p className="text-[12px] text-muted">이동 구간이 없어요(장소가 2곳 이상이면 표시돼요).</p>
      ) : (
        <div className="space-y-2">
          {/* 자차 — 카카오 모빌리티 실측 합산 */}
          <div className="flex items-center gap-2.5 rounded-button bg-[#FFF7F0] px-3 py-2">
            <ModeIcon kind="car" />
            <span className="text-[12px] font-bold text-muted">자차</span>
            <span className="ml-auto text-[13px] font-extrabold text-foreground">
              {car.known === 0
                ? (car.pending ? '계산 중…' : '정보 없음')
                : <>{formatDuration(car.dur)} · {formatKm(car.dist)}{car.pending && <span className="text-[11px] font-bold text-[#BCA48C]"> · 계산 중…</span>}</>}
            </span>
          </div>
          {/* 대중교통 — 카카오 공개 API 미지원 → 안내만 */}
          <div className="flex items-center gap-2.5 rounded-button bg-background px-3 py-2">
            <ModeIcon kind="transit" />
            <span className="text-[12px] font-bold text-muted">대중교통</span>
            <span className="ml-auto text-[12px] font-semibold text-[#BCA48C]">정보 제공 불가 · 네이버 지도 참고</span>
          </div>
          <p className="text-[11px] text-[#BCA48C]">자차 기준 카카오 모빌리티 실측 합산 · 직선 순서 기준</p>
        </div>
      )}
    </div>
  );
}

function ModeIcon({ kind }: { kind: 'car' | 'transit' }) {
  const d = kind === 'car'
    ? 'M5 11l2-5h10l2 5M5 11h14v5H5v-5ZM7 16v2M17 16v2'
    : 'M6 4h12v11H6zM6 15l-1 4M18 15l1 4M9 18h6M9 8h6';
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden className="text-[#E8742E]">
      <path d={d} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function DayChip({ label, color, active, onClick }: { label: string; color?: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn('inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-[13px] font-bold transition-colors',
        active ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-surface text-muted')}
    >
      {color && <span className="size-2.5 rounded-full" style={{ background: color }} />}
      {label}
    </button>
  );
}

/** 핀 클릭 시 지도 위에 뜨는 상세 카드. 숙소면 예약 상태/금액·머무는 기간을 보여준다. */
function DetailCard({ pin, onClose }: { pin: Pin; onClose: () => void }) {
  const stayPeriod = pin.stayDate
    ? pin.stayEndDate && pin.stayEndDate !== pin.stayDate
      ? `${shortDate(pin.stayDate)} ~ ${shortDate(pin.stayEndDate)}`
      : `${shortDate(pin.stayDate)} 1박`
    : '날짜 미정';
  return (
    <div className="absolute inset-x-2 bottom-2 z-10 rounded-card border border-border bg-surface p-3.5 shadow-lg">
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            {pin.isStay
              ? <span className="rounded-full bg-[#FFF1E6] px-2 py-0.5 text-[11px] font-extrabold text-[#E8742E]">숙소</span>
              : <span className="rounded-full bg-[#FFF1E6] px-2 py-0.5 text-[11px] font-extrabold text-[#E8742E]">{pin.order}번째 일정</span>}
            <span className="min-w-0 flex-1 truncate text-[15px] font-extrabold text-foreground">{pin.name}</span>
          </div>
          {pin.address && <p className="mt-1 line-clamp-1 text-[12px] text-muted">{pin.address}</p>}

          {pin.isStay ? (
            <div className="mt-2 space-y-0.5 text-[13px]">
              <div className="flex items-center gap-1.5">
                <span className="text-[#A6907B]">상태</span>
                <span className="font-bold text-foreground">{pin.status === 'BOOKED' ? '예약 완료' : '선정됨'}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-[#A6907B]">머무는 기간</span>
                <span className="font-bold text-foreground">{stayPeriod}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-[#A6907B]">예약 금액</span>
                <span className="font-bold text-foreground">
                  {pin.reservationPrice != null ? won(pin.reservationPrice) : '미입력'}
                </span>
              </div>
            </div>
          ) : (
            <div className="mt-2 text-[13px]">
              <span className="text-[#A6907B]">시간 </span>
              <span className="font-bold text-foreground">
                {pin.date ? `${shortDate(pin.date)} · ` : ''}{pin.startTime}–{pin.endTime}
              </span>
            </div>
          )}

          <a
            href={naverPlaceUrl(pin.name, pin.address)}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 inline-flex items-center gap-1 text-[12px] font-bold text-[#03C75A]"
          >
            <span className="flex size-3.5 items-center justify-center rounded-[3px] bg-[#03C75A] text-[9px] font-black leading-none text-white">N</span>
            네이버 지도에서 보기 ↗
          </a>
        </div>
        <button
          type="button"
          aria-label="닫기"
          onClick={onClose}
          className="flex size-7 shrink-0 items-center justify-center rounded-full text-muted hover:bg-black/5"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </button>
      </div>
    </div>
  );
}

/** 지도 SDK 미동작 시(키/도메인 미설정) 핀 목록 폴백 — 네이버 지도 링크로 위치 확인. */
function MapFallback({ pins, message }: { pins: Pin[]; message: string }) {
  return (
    <div className="space-y-2.5">
      <p className="rounded-card border border-[#FFCBA6] bg-[#FFF7F0] px-3.5 py-2.5 text-[12px] font-semibold text-[#A8662F]">
        {message} 지도를 켜려면 카카오 JavaScript 키를 설정해 주세요. 우선 장소 목록으로 보여드려요.
      </p>
      {pins.map((p, i) => (
        <a
          key={`${p.lat}-${p.lng}-${i}`}
          href={naverPlaceUrl(p.name, p.address)}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-3 rounded-card border border-border bg-surface p-3 active:scale-[.99]"
        >
          {p.isStay
            ? <StayGlyph />
            : <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-[#FFF1E6] text-[12px] font-extrabold text-[#E8742E]">{p.order}</span>}
          <div className="min-w-0 flex-1">
            <div className="truncate text-[14px] font-bold text-foreground">{p.name}</div>
            <div className="text-[11px] text-muted">{p.isStay ? '숙소' : p.date ? `${shortDate(p.date)} 일정` : '일정'} · 네이버 지도에서 보기 ↗</div>
          </div>
        </a>
      ))}
    </div>
  );
}
