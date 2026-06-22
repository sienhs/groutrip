package com.enjoytrip.backend.domain.recommend.dto;

import com.enjoytrip.backend.domain.recommend.client.TourSpot;

/**
 * FR-RECOMMEND-02: 추천 관광지 응답. matchScore는 그룹 평균 성향과의 코사인 유사도(%) 기반 정렬 점수다.
 * 성향 정보가 없으면 matchScore는 null이며 TourAPI 기본 순서를 따른다.
 */
public record RecommendationResponse(
        String contentId,
        String title,
        String address,
        double latitude,
        double longitude,
        int contentTypeId,
        String thumbnailUrl,
        Integer matchScore
) {

    public static RecommendationResponse of(TourSpot spot, Integer matchScore) {
        return new RecommendationResponse(
                spot.contentId(),
                spot.title(),
                spot.address(),
                spot.latitude(),
                spot.longitude(),
                spot.contentTypeId(),
                spot.thumbnailUrl(),
                matchScore
        );
    }
}
