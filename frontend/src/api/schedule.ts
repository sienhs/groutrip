import instance from './instance';
import type { ApiResponse } from '../types/auth';
import type {
  Schedule,
  ScheduleCreateRequest,
  ScheduleUpdateRequest,
  ReorderItem,
  TransportLeg,
  TransportMode,
  TransportExpenseRequest,
} from '../types/schedule';

/** 일정 API (백엔드 Part A). */

// 백엔드 ScheduleResponse: 장소가 중첩(place.name/placeId)이고 시각은 "HH:mm:ss".
// FE Schedule(평탄화 placeName/placeId, "HH:mm")로 매핑한다.
interface ScheduleApiResponse {
  id: number;
  place: { placeId: number; name: string; latitude: number; longitude: number; types?: string[] } | null; // 빈 일정이면 null
  title: string | null;
  scheduleDate: string;
  orderIndex: number;
  startTime: string;
  endTime: string;
  memo: string | null;
  estimatedCost: number | null;
  transportMode: TransportMode | null;
  status: string | null;
}

const hhmm = (t: string | null | undefined): string => (t ?? '').slice(0, 5);

const toSchedule = (r: ScheduleApiResponse): Schedule => ({
  id: r.id,
  placeId: r.place ? r.place.placeId : null,
  placeName: r.place ? r.place.name : null,
  placeLat: r.place ? r.place.latitude : null,
  placeLng: r.place ? r.place.longitude : null,
  title: r.title,
  category: null,
  scheduleDate: r.scheduleDate,
  startTime: hhmm(r.startTime),
  endTime: hhmm(r.endTime),
  memo: r.memo,
  estimatedCost: r.estimatedCost,
  transportMode: r.transportMode,
  orderIndex: r.orderIndex,
  status: r.status,
});

/** 일정 목록. date 없으면 전체. */
export const getSchedules = async (groupId: number, date?: string): Promise<Schedule[]> => {
  const res = await instance.get<ApiResponse<ScheduleApiResponse[]>>(`/api/groups/${groupId}/schedules`, {
    params: { date },
  });
  return res.data.data.map(toSchedule);
};

/** 일정 추가(보관함 placeId 기반). */
export const addSchedule = async (groupId: number, body: ScheduleCreateRequest): Promise<Schedule> => {
  const res = await instance.post<ApiResponse<ScheduleApiResponse>>(`/api/groups/${groupId}/schedules`, body);
  return toSchedule(res.data.data);
};

/** 일정 수정(시간/메모/비용/상태). 위치 변경은 reorder 로. */
export const updateSchedule = async (
  groupId: number,
  scheduleId: number,
  body: ScheduleUpdateRequest,
): Promise<Schedule> => {
  const res = await instance.patch<ApiResponse<ScheduleApiResponse>>(
    `/api/groups/${groupId}/schedules/${scheduleId}`,
    body,
  );
  return toSchedule(res.data.data);
};

/**
 * 일정 예상 비용 설정(정산 연동). 결제자를 지정하면 균등 분담 지출로 등록/수정,
 * estimatedCost를 null/0으로 보내면 연동 지출을 제거한다.
 */
export const setScheduleCost = async (
  groupId: number,
  scheduleId: number,
  body: { estimatedCost: number | null; payerId: number | null },
): Promise<Schedule> => {
  const res = await instance.patch<ApiResponse<ScheduleApiResponse>>(
    `/api/groups/${groupId}/schedules/${scheduleId}/cost`,
    body,
  );
  return toSchedule(res.data.data);
};

/** 일정 삭제. */
export const deleteSchedule = async (groupId: number, scheduleId: number): Promise<void> => {
  await instance.delete<ApiResponse<unknown>>(`/api/groups/${groupId}/schedules/${scheduleId}`);
};

/** 빈 일정의 장소를 Owner가 직접 확정(투표 대신). */
export const setSchedulePlace = async (
  groupId: number,
  scheduleId: number,
  placeId: number,
): Promise<Schedule> => {
  const res = await instance.patch<ApiResponse<ScheduleApiResponse>>(
    `/api/groups/${groupId}/schedules/${scheduleId}/place`,
    { placeId },
  );
  return toSchedule(res.data.data);
};

/** 순서 일괄 변경(드래그 종료 시). 날짜 이동 포함. */
export const reorderSchedules = async (groupId: number, items: ReorderItem[]): Promise<void> => {
  await instance.patch<ApiResponse<unknown>>(`/api/groups/${groupId}/schedules/reorder`, { items });
};

/** 두 일정 사이 이동 카드. 대중교통은 available=false. */
export const getTransportLeg = async (
  groupId: number,
  fromScheduleId: number,
  toScheduleId: number,
  mode: TransportMode = 'CAR',
): Promise<TransportLeg> => {
  const res = await instance.get<ApiResponse<TransportLeg>>(
    `/api/groups/${groupId}/schedules/transport`,
    { params: { fromScheduleId, toScheduleId, mode } },
  );
  return res.data.data;
};

/**
 * 두 일정 사이의 자동차 도로 경로 좌표열([위도,경도] 목록). 지도에 실제 이동 경로 선을 그릴 때 사용.
 * 길찾기 실패 시 available=false + 빈 path → 호출부가 직선으로 폴백한다.
 */
export const getTransportPath = async (
  groupId: number,
  fromScheduleId: number,
  toScheduleId: number,
): Promise<{ available: boolean; path: [number, number][] }> => {
  const res = await instance.get<ApiResponse<{ available: boolean; path: [number, number][] }>>(
    `/api/groups/${groupId}/schedules/transport-path`,
    { params: { fromScheduleId, toScheduleId } },
  );
  return res.data.data;
};

/** 이동 비용 정산 추가. costType: DRIVING(톨+연료)/TAXI/TRANSIT. */
export const addTransportExpense = async (
  groupId: number,
  body: TransportExpenseRequest,
): Promise<void> => {
  await instance.post<ApiResponse<unknown>>(
    `/api/groups/${groupId}/schedules/transport-expense`,
    body,
  );
};
