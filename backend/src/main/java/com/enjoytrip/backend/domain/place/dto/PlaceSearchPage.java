package com.enjoytrip.backend.domain.place.dto;

import java.util.List;

/**
 * FR-PLACE-01: 검색 한 페이지(결과 + 다음 페이지 토큰).
 * 컨트롤러는 {@code results}를 ApiResponse.data로, {@code nextPageToken}을 X-Next-Page-Token 헤더로 내려
 * 기존 배열 응답 계약을 유지하면서 무한 스크롤을 지원한다. 캐시 직렬화 단위로도 재사용한다.
 */
public record PlaceSearchPage(
        List<PlaceSearchResult> results,
        String nextPageToken
) {
}
