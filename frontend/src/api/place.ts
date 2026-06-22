import instance from './instance';
import type { ApiResponse } from '../types/auth';
import type {
  PlaceSearchResult,
  BookmarkResponse,
  BookmarkCreateRequest,
  BookmarkUpdateRequest,
  BookmarkListParams,
  PlaceCategory,
} from '../types/place';

/**
 * Place(장소) API — 컴포넌트는 이 함수들만 호출한다.
 * 토큰은 instance 요청 인터셉터가 자동 주입한다.
 */

export interface PlaceSearchPage {
  items: PlaceSearchResult[];
  /** 다음 페이지 토큰(응답 헤더). null 이면 끝. */
  nextPageToken: string | null;
}

/**
 * 장소 검색(무한 스크롤). category 미지정 = 전체. query 공백만이면 400.
 * 다음 페이지 토큰은 응답 헤더로 내려오며 pageToken 으로 다시 요청한다(한 페이지 15개).
 * ⚠️ 헤더 키는 백엔드 구현에 맞춰 조정(현재 X-Next-Page-Token 가정).
 */
export const searchPlaces = async (
  groupId: number,
  query: string,
  category?: PlaceCategory,
  pageToken?: string,
): Promise<PlaceSearchPage> => {
  const res = await instance.get<ApiResponse<PlaceSearchResult[]>>(
    `/api/groups/${groupId}/places/search`,
    { params: { query, category, pageToken } },
  );
  const h = res.headers ?? {};
  const nextPageToken =
    (h['x-next-page-token'] as string | undefined) ??
    (h['X-Next-Page-Token'] as string | undefined) ??
    null;
  return { items: res.data.data, nextPageToken };
};

/** 보관함 추가. */
export const addBookmark = async (
  groupId: number,
  body: BookmarkCreateRequest,
): Promise<BookmarkResponse> => {
  const res = await instance.post<ApiResponse<BookmarkResponse>>(
    `/api/groups/${groupId}/places`,
    body,
  );
  return res.data.data;
};

/** 보관함 목록. 필터/정렬 모두 선택. */
export const getBookmarks = async (
  groupId: number,
  params: BookmarkListParams = {},
): Promise<BookmarkResponse[]> => {
  const res = await instance.get<ApiResponse<BookmarkResponse[]>>(
    `/api/groups/${groupId}/places`,
    { params },
  );
  return res.data.data;
};

/** 보관함 수정(작성자/Owner). */
export const updateBookmark = async (
  groupId: number,
  bookmarkId: number,
  body: BookmarkUpdateRequest,
): Promise<BookmarkResponse> => {
  const res = await instance.patch<ApiResponse<BookmarkResponse>>(
    `/api/groups/${groupId}/places/${bookmarkId}`,
    body,
  );
  return res.data.data;
};

/** 보관함 삭제(작성자/Owner). */
export const deleteBookmark = async (groupId: number, bookmarkId: number): Promise<void> => {
  await instance.delete<ApiResponse<null>>(`/api/groups/${groupId}/places/${bookmarkId}`);
};

/**
 * 장소 사진 프록시 절대 URL.
 * photoUrl 은 BE 상대경로(/api/places/photo?name=...) → baseURL 을 붙여 <img src> 로 사용.
 */
export const placePhotoSrc = (photoUrl: string | null): string | null => {
  if (!photoUrl) return null;
  const base = import.meta.env.VITE_API_BASE_URL ?? '';
  return `${base}${photoUrl}`;
};
