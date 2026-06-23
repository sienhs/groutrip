/**
 * 추천(FR-RECOMMEND) — TourAPI 프록시. 백엔드 Part A 계약.
 * thumbnailUrl 은 절대 URL(visitkorea) → 그대로 <img>.
 * matchScore 는 성향 미응답 시 null(TourAPI 기본순).
 */

export interface RecommendItem {
  contentId: number;
  title: string;
  address: string;
  latitude: number;
  longitude: number;
  /** 12관광지/14문화/15행사/25코스/28레포츠/32숙박/38쇼핑/39음식 */
  contentTypeId: number;
  /** 서버가 내려주는 카테고리명(숙박/음식점 등). 구버전 캐시 대비 optional. */
  categoryLabel?: string;
  /** 절대 URL. 없을 수 있음 */
  thumbnailUrl: string | null;
  /** 0~100 성향 일치 점수. 미응답 시 null */
  matchScore: number | null;
  /** 추천 이유(그룹 성향 + 카테고리 기반). 구버전 캐시 대비 optional. */
  reason?: string;
}

export const CONTENT_TYPE_LABEL: Record<number, string> = {
  12: '관광지',
  14: '문화시설',
  15: '행사',
  25: '여행코스',
  28: '레포츠',
  32: '숙박',
  38: '쇼핑',
  39: '음식',
};

export const contentTypeLabel = (id: number): string => CONTENT_TYPE_LABEL[id] ?? '추천';
