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
  place: { placeId: number; name: string; types?: string[] } | null; // 빈 일정이면 null
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

/** 일정 삭제. */
export const deleteSchedule = async (groupId: number, scheduleId: number): Promise<void> => {
  await instance.delete<ApiResponse<unknown>>(`/api/groups/${groupId}/schedules/${scheduleId}`);
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
