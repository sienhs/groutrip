package com.enjoytrip.backend.domain.place.client;

import java.util.List;

/**
 * Google Places(Text Search / Place Details) 응답을 파싱한 클라이언트 계층 DTO.
 * 검색 결과는 상세 필드(phoneNumber/openingHours/websiteUri)가 null이고,
 * Place Details 호출 결과만 해당 필드가 채워진다.
 * {@code photoName}은 가공 전 원본 리소스 이름(places/{id}/photos/{ref})이다.
 */
public record GooglePlace(
        String googlePlaceId,
        String name,
        String address,
        double latitude,
        double longitude,
        List<String> types,
        Double rating,
        Integer ratingCount,
        String priceLevel,
        String photoName,
        String googleMapsUri,
        String phoneNumber,
        String openingHours,
        String websiteUri
) {
}
