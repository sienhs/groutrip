package com.enjoytrip.backend.domain.recommend.client;

/**
 * EI-03: TourAPI(한국관광공사) areaBasedList 응답에서 추출한 관광지 정보.
 * thumbnailUrl(firstimage)은 공개 URL이라 키 없이 그대로 노출 가능하다.
 */
public record TourSpot(
        String contentId,
        String title,
        String address,
        double latitude,
        double longitude,
        int contentTypeId,
        String thumbnailUrl
) {
}
