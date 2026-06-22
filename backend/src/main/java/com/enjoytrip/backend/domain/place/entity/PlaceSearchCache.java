package com.enjoytrip.backend.domain.place.entity;

import java.time.LocalDateTime;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

/**
 * FR-PLACE-01 / NFR-PERF: Google Places Text Search 결과 24시간 DB 캐시.
 * (검색어 + 카테고리 + 지역) 조합을 정규화한 {@link #cacheKey}로 식별하며,
 * 만료된 캐시는 재검색 시 갱신한다. Google 호출량 통제의 핵심.
 */
@Entity
@Table(name = "place_search_cache")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class PlaceSearchCache {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // (검색어 + 카테고리 + 지역)을 정규화한 캐시 키. 동일 조합 재요청을 차단한다.
    @Column(nullable = false, unique = true, length = 500)
    private String cacheKey;

    // 직렬화한 검색 결과(List<PlaceSearchResult> JSON).
    @Column(nullable = false, columnDefinition = "TEXT")
    private String resultJson;

    @Column(nullable = false)
    private LocalDateTime expiresAt;

    @Column(nullable = false)
    private LocalDateTime createdAt;

    @Builder
    private PlaceSearchCache(String cacheKey, String resultJson, LocalDateTime expiresAt) {
        this.cacheKey = cacheKey;
        this.resultJson = resultJson;
        this.expiresAt = expiresAt;
        this.createdAt = LocalDateTime.now();
    }

    // 만료된 캐시는 무효 처리하고 재검색으로 갱신한다.
    public boolean isExpired(LocalDateTime now) {
        return now.isAfter(expiresAt);
    }

    // 동일 키 재검색 시 결과와 만료 시각을 새로 갱신한다.
    public void refresh(String resultJson, LocalDateTime expiresAt) {
        this.resultJson = resultJson;
        this.expiresAt = expiresAt;
        this.createdAt = LocalDateTime.now();
    }
}
