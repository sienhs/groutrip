/**
 * Place(장소) 도메인 타입 — Phase 2 백엔드 컨트랙트 기준.
 * 모든 응답은 ApiResponse<T> 로 래핑되며 api/place.ts 에서 언래핑한다.
 */

/** 우리 서비스 카테고리(enum name). 요청/응답 모두 이 값을 사용. */
export type PlaceCategory =
  | 'LODGING'
  | 'RESTAURANT'
  | 'CAFE'
  | 'TOURIST_ATTRACTION'
  | 'SHOPPING'
  | 'ETC';

/** Google 원본 가격대. 없으면 null. */
export type PriceLevel =
  | 'PRICE_LEVEL_FREE'
  | 'PRICE_LEVEL_INEXPENSIVE'
  | 'PRICE_LEVEL_MODERATE'
  | 'PRICE_LEVEL_EXPENSIVE'
  | 'PRICE_LEVEL_VERY_EXPENSIVE';

/** 보관함 목록 정렬 기준(query param). */
export type BookmarkSort = 'RECENT' | 'RATING' | 'NAME';

/** ① 검색 결과 카드용 (Place Details 미호출 → 전화/영업시간 없음). */
export interface PlaceSearchResult {
  googlePlaceId: string;
  name: string;
  category: PlaceCategory;
  address: string | null;
  latitude: number;
  longitude: number;
  types: string[];
  rating: number | null;
  ratingCount: number | null;
  priceLevel: PriceLevel | null;
  /** BE 프록시 상대경로(/api/places/photo?name=...). placePhotoSrc() 로 변환해 사용. */
  photoUrl: string | null;
  googleMapsUri: string | null;
}

/** ② 보관함 항목 안의 장소 정보. 검색 결과에서 category 제외 + Details 보강 3필드. */
export interface PlaceResponse {
  /** 내부 Place id. 일정 생성/투표 후보 등록(placeId)에 사용. */
  placeId: number;
  googlePlaceId: string;
  name: string;
  address: string | null;
  latitude: number;
  longitude: number;
  types: string[];
  rating: number | null;
  ratingCount: number | null;
  priceLevel: PriceLevel | null;
  photoUrl: string | null;
  googleMapsUri: string | null;
  phoneNumber: string | null;
  openingHours: string | null;
  websiteUri: string | null;
}

/** ③ 보관함 항목(목록/상세). id = bookmarkId. */
export interface BookmarkResponse {
  id: number;
  place: PlaceResponse;
  /** 사용자 지정 태그 */
  categoryTag: PlaceCategory;
  memo: string | null;
  personalRating: number | null;
  createdById: number;
  createdByName: string;
  /** ISO datetime */
  createdAt: string;
}

/** ④ 보관함 추가 요청. */
export interface BookmarkCreateRequest {
  googlePlaceId: string;
  categoryTag: PlaceCategory;
  /** 최대 500자 */
  memo?: string;
  /** 1~5 */
  personalRating?: number;
}

/** ⑤ 보관함 수정 요청(작성자/Owner). */
export interface BookmarkUpdateRequest {
  categoryTag: PlaceCategory;
  memo?: string;
  personalRating?: number;
}

/** ⑥ 보관함 목록 조회 파라미터(모두 선택). */
export interface BookmarkListParams {
  category?: PlaceCategory;
  creatorId?: number;
  priceLevel?: PriceLevel;
  sort?: BookmarkSort;
}

/* ── 표시용 상수 (UI 라벨/순서) ───────────────────────────── */

/** 카테고리 칩 정의(순서 = 표시 순서). "전체"는 category 파라미터 미전송으로 별도 처리. */
export const PLACE_CATEGORIES: ReadonlyArray<{ value: PlaceCategory; label: string }> = [
  { value: 'LODGING', label: '숙소' },
  { value: 'RESTAURANT', label: '맛집' },
  { value: 'CAFE', label: '카페' },
  { value: 'TOURIST_ATTRACTION', label: '명소' },
  { value: 'SHOPPING', label: '쇼핑' },
  { value: 'ETC', label: '기타' },
];

export const CATEGORY_LABEL: Record<PlaceCategory, string> = {
  LODGING: '숙소',
  RESTAURANT: '맛집',
  CAFE: '카페',
  TOURIST_ATTRACTION: '명소',
  SHOPPING: '쇼핑',
  ETC: '기타',
};

/** 가격대 표시 라벨(₩ 개수). FREE 는 "무료". */
export const PRICE_LEVEL_LABEL: Record<PriceLevel, string> = {
  PRICE_LEVEL_FREE: '무료',
  PRICE_LEVEL_INEXPENSIVE: '₩',
  PRICE_LEVEL_MODERATE: '₩₩',
  PRICE_LEVEL_EXPENSIVE: '₩₩₩',
  PRICE_LEVEL_VERY_EXPENSIVE: '₩₩₩₩',
};

export const BOOKMARK_SORTS: ReadonlyArray<{ value: BookmarkSort; label: string }> = [
  { value: 'RECENT', label: '최근 추가순' },
  { value: 'RATING', label: '평점 높은순' },
  { value: 'NAME', label: '이름순' },
];
