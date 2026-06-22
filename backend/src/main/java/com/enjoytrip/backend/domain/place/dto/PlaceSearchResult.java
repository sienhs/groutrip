package com.enjoytrip.backend.domain.place.dto;

import java.util.List;

/**
 * EI-01-E: Google Text Search 응답을 우리 표준 형태로 변환한 검색 결과 항목.
 * 검색 시점에는 Place Details를 호출하지 않으므로 전화/영업시간은 포함하지 않는다.
 * {@code photoUrl}은 키 노출을 막기 위해 BE 사진 프록시 경로다.
 */
public record PlaceSearchResult(
        String googlePlaceId,
        String name,
        String category,        // 우리 카테고리(PlaceCategory 이름)
        String address,
        double latitude,
        double longitude,
        List<String> types,
        Double rating,
        Integer ratingCount,
        String priceLevel,
        String photoUrl,
        String googleMapsUri
) {
}
