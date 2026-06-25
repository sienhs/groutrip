package com.enjoytrip.backend.domain.place.dto;

import java.util.List;

/**
 * 장소/숙소의 구글 리뷰 AI 요약 응답(구조화).
 *  - available=false면 요약 불가(리뷰 부족·AI 키 미설정 등) → message로 안내.
 *  - overall(한 줄 총평) + pros(장점) + cons(아쉬운 점)으로 나눠 FE가 직접 스타일링한다(마크다운 미사용).
 *  - rating/ratingCount/reviewCount는 구글 원자료.
 */
public record ReviewSummaryResponse(
        boolean available,
        Double rating,
        Integer ratingCount,
        int reviewCount,
        String overall,
        List<String> pros,
        List<String> cons,
        String message
) {
    public static ReviewSummaryResponse unavailable(String message, Double rating, Integer ratingCount) {
        return new ReviewSummaryResponse(false, rating, ratingCount, 0, null, List.of(), List.of(), message);
    }

    public static ReviewSummaryResponse of(Double rating, Integer ratingCount, int reviewCount,
                                           String overall, List<String> pros, List<String> cons) {
        return new ReviewSummaryResponse(true, rating, ratingCount, reviewCount, overall, pros, cons, null);
    }
}
