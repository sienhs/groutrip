import instance from './instance';
import type { ApiResponse } from '../types/auth';
import type { Accommodation } from '../types/accommodation';

/**
 * 숙소 선정/예약 API (백엔드 Part A).
 * 숙소는 Google Places(lodging) 검색(searchPlaces)에서 고른 googlePlaceId로 선정한다.
 */

/** 숙소 선정. 응답의 bookingSearchUrl로 네이버 최저가 핸드오프. */
export const selectAccommodation = async (
  groupId: number,
  body: { googlePlaceId: string; sigungu?: string },
): Promise<Accommodation> => {
  const res = await instance.post<ApiResponse<Accommodation>>(
    `/api/groups/${groupId}/accommodations`,
    body,
  );
  return res.data.data;
};

/** 그룹 숙소 선정/예약 목록(최근순). 계획 재진입 시 상태 복원용. */
export const getAccommodations = async (groupId: number): Promise<Accommodation[]> => {
  const res = await instance.get<ApiResponse<Accommodation[]>>(
    `/api/groups/${groupId}/accommodations`,
  );
  return res.data.data;
};

/** 외부 예약 완료 확정. 예약가 또는 사진 중 최소 하나 전달(multipart). */
export const confirmBooking = async (
  groupId: number,
  accommodationId: number,
  body: { reservationPrice?: number; photo?: File },
): Promise<Accommodation> => {
  const form = new FormData();
  if (body.reservationPrice != null) form.append('reservationPrice', String(body.reservationPrice));
  if (body.photo) form.append('photo', body.photo);
  const res = await instance.post<ApiResponse<Accommodation>>(
    `/api/groups/${groupId}/accommodations/${accommodationId}/booking`,
    form,
    { headers: { 'Content-Type': 'multipart/form-data' } },
  );
  return res.data.data;
};

/**
 * 예약완료 사진을 인증(Authorization 헤더) 포함 blob으로 받아 object URL로 변환.
 * <img src>는 헤더를 못 실으므로 이 방식으로 표시한다. 사용 후 URL.revokeObjectURL 권장.
 */
export const fetchBookingPhotoUrl = async (bookingPhotoUrl: string): Promise<string> => {
  const res = await instance.get(bookingPhotoUrl, { responseType: 'blob' });
  return URL.createObjectURL(res.data as Blob);
};
