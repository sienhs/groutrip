import type { PlaceResponse } from './place';

/** 숙소 선정/예약 상태. */
export type BookingStatus = 'SELECTED' | 'BOOKED';

/** 그룹 숙소 선정/예약 응답(백엔드 AccommodationResponse). */
export interface Accommodation {
  id: number;
  place: PlaceResponse;
  /** 추천/맥락용 시·군·구(상세주소 경로면 null). */
  sigungu: string | null;
  /** 숙박 시작일(YYYY-MM-DD). 미지정이면 null. */
  stayDate: string | null;
  /** 숙박 종료일(여러 박이면 마지막 박, 1박이면 stayDate와 동일). */
  stayEndDate: string | null;
  status: BookingStatus;
  /** 사용자가 입력한 예약 금액(원). 없으면 null. */
  reservationPrice: number | null;
  /** 예약완료 사진을 인증 조회하는 BE 경로(없으면 null). 직접 <img src>로 쓰지 말고 blob fetch. */
  bookingPhotoUrl: string | null;
  /** 네이버 호텔 가격비교 검색 딥링크. */
  bookingSearchUrl: string;
  createdAt: string;
}
