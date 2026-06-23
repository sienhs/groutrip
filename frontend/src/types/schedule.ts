/**
 * 일정(FR-SCHEDULE) — 백엔드 Part A 계약.
 *  - 일정 추가는 보관함 placeId 기반(직접검색→일정은 보관함 추가 먼저)
 *  - 위치 변경은 reorder 전담(수정과 분리)
 *  - 이동수단 mode: CAR / TRANSIT / WALK (TAXI 는 비용 유형이지 모드 아님)
 *  - 대중교통(TRANSIT) 이동정보는 available=false (카카오 공개 API 미지원)
 */

export type TransportMode = 'CAR' | 'TRANSIT' | 'WALK';
export type TransportCostType = 'DRIVING' | 'TAXI' | 'TRANSIT';

export interface Schedule {
  id: number;
  /** 빈 일정(투표로 정할 일정)이면 null */
  placeId: number | null;
  placeName: string | null;
  placeLat: number | null;
  placeLng: number | null;
  /** 빈 일정의 사용자 제목 */
  title: string | null;
  category?: string | null;
  scheduleDate: string; // YYYY-MM-DD
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  memo: string | null;
  estimatedCost: number | null;
  transportMode: TransportMode | null;
  orderIndex: number;
  status?: string | null;
}

export interface ScheduleCreateRequest {
  /** 보관함 장소 id. 빈 일정이면 생략하고 title을 보낸다. */
  placeId?: number;
  /** 빈 일정 제목(placeId 없을 때 필수) */
  title?: string;
  scheduleDate: string;
  startTime: string;
  endTime: string;
  memo?: string;
  estimatedCost?: number;
  transportMode?: TransportMode;
}

export interface ScheduleUpdateRequest {
  startTime?: string;
  endTime?: string;
  memo?: string;
  estimatedCost?: number;
  transportMode?: TransportMode;
  status?: string;
}

/** reorder 일괄 항목(드래그 종료 시). 날짜 이동 포함. */
export interface ReorderItem {
  scheduleId: number;
  scheduleDate: string;
  orderIndex: number;
}

/** 이동 카드(TransportLegResponse). 대중교통은 available=false. */
export interface TransportLeg {
  mode: TransportMode;
  available: boolean;
  durationMinutes: number;
  distanceMeters: number;
  toll: number;
  fuelCost: number;
  carCost: number;
  taxiFare: number;
  transitFare: number;
  transferCount: number;
  routeSummary: string | null;
  note: string | null;
}

export interface TransportExpenseRequest {
  fromScheduleId: number;
  toScheduleId: number;
  costType: TransportCostType;
  payerId: number;
  participantIds?: number[];
}

/* ── 표시 유틸 ── */

export const TRANSPORT_META: Record<TransportMode, { label: string }> = {
  CAR: { label: '자차' },
  TRANSIT: { label: '대중교통' },
  WALK: { label: '도보' },
};

export const formatKm = (m: number): string =>
  m >= 1000 ? `${(m / 1000).toFixed(1)}km` : `${m}m`;

export const formatDuration = (min: number): string => {
  if (min < 60) return `${min}분`;
  const h = Math.floor(min / 60);
  const r = min % 60;
  return r ? `${h}시간 ${r}분` : `${h}시간`;
};

export const formatCost = (won: number): string => `₩${won.toLocaleString('ko-KR')}`;
