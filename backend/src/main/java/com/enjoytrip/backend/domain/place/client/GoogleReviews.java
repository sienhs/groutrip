package com.enjoytrip.backend.domain.place.client;

import java.util.List;

/**
 * Google Place Details의 평점·리뷰 묶음. 리뷰 요약(AI) 입력으로 사용한다.
 * Places API(New)는 장소당 최대 5개의 대표 리뷰를 제공한다.
 */
public record GoogleReviews(
        Double rating,
        Integer ratingCount,
        List<Review> reviews
) {
    /** 개별 구글 리뷰(작성자/별점/본문/상대시각). */
    public record Review(
            String author,
            Double rating,
            String text,
            String relativeTime
    ) {
    }
}
