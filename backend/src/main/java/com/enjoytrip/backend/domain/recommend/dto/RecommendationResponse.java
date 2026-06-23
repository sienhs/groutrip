package com.enjoytrip.backend.domain.recommend.dto;

import java.util.Map;

import com.enjoytrip.backend.domain.recommend.client.TourSpot;

/**
 * FR-RECOMMEND-02: 추천 관광지 응답. matchScore는 그룹 평균 성향과의 코사인 유사도(%) 기반 정렬 점수다.
 * 성향 정보가 없으면 matchScore는 null이며 TourAPI 기본 순서를 따른다.
 * categoryLabel(숙박/음식점 등)과 reason(추천 이유)으로 "이름만 보여서 뭔지 모르겠다"는 문제를 해소한다.
 */
public record RecommendationResponse(
        String contentId,
        String title,
        String address,
        double latitude,
        double longitude,
        int contentTypeId,
        String categoryLabel,
        String thumbnailUrl,
        Integer matchScore,
        String reason
) {

    // contentTypeId → 사람이 읽는 카테고리명. 프론트와 동일한 분류 체계를 서버에서 권위 있게 내려준다.
    private static final Map<Integer, String> CATEGORY_LABELS = Map.of(
            12, "관광지",
            14, "문화시설",
            15, "축제·행사",
            25, "여행코스",
            28, "레포츠",
            32, "숙박",
            38, "쇼핑",
            39, "음식점"
    );

    public static String categoryLabelOf(int contentTypeId) {
        return CATEGORY_LABELS.getOrDefault(contentTypeId, "여행지");
    }

    public static RecommendationResponse of(TourSpot spot, Integer matchScore, String reason) {
        return new RecommendationResponse(
                spot.contentId(),
                spot.title(),
                spot.address(),
                spot.latitude(),
                spot.longitude(),
                spot.contentTypeId(),
                categoryLabelOf(spot.contentTypeId()),
                spot.thumbnailUrl(),
                matchScore,
                reason
        );
    }
}
