/**
 * 네이버 지도 외부 이동 URL 헬퍼.
 * 장소명(+지역)으로 네이버 지도 검색을 열어 해당 장소의 리뷰/사진을 볼 수 있게 한다.
 * 모바일에서는 네이버 지도 앱으로 딥링크된다.
 */
export const naverPlaceUrl = (name: string, address?: string | null): string => {
  // 동명 장소 구분을 위해 주소 앞부분(시/군/구 정도)을 힌트로 덧붙인다.
  const regionHint = address ? address.trim().split(/[\s,]+/).slice(0, 2).join(' ') : '';
  const query = [regionHint, name].filter(Boolean).join(' ').trim() || name;
  return `https://map.naver.com/p/search/${encodeURIComponent(query)}`;
};
