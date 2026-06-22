package com.enjoytrip.backend.domain.place.dto;

/**
 * FR-PLACE-03: 보관함 정렬 기준.
 */
public enum BookmarkSort {
    RECENT, // 최근 추가순(기본)
    RATING, // 평점 높은순
    NAME    // 이름 가나다순
}
