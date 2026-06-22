import instance from './instance';
import type { ApiResponse } from '../types/auth';
import type { RecommendItem } from '../types/recommend';

/**
 * 추천 API (백엔드 Part A). 성향순 상위 20.
 * ⚠️ "원클릭 보관함 담기" 전용 엔드포인트는 없음 — 추천 장소명으로
 *    장소검색(searchPlaces) → 보관함추가(addBookmark) 플로우를 태운다(Google 단일 소스 규칙).
 */
export const getRecommendations = async (
  groupId: number,
  contentTypeId?: number,
): Promise<RecommendItem[]> => {
  const res = await instance.get<ApiResponse<RecommendItem[]>>(
    `/api/groups/${groupId}/recommendations`,
    { params: { contentTypeId } },
  );
  return res.data.data;
};
