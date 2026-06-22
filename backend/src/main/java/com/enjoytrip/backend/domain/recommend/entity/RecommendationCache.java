package com.enjoytrip.backend.domain.recommend.entity;

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
 * EI-03 / NFR-PERF: TourAPI 결과 24시간 DB 캐시. (지역 + 카테고리) 조합으로 식별한다.
 */
@Entity
@Table(name = "recommendation_cache")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class RecommendationCache {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 100)
    private String cacheKey;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String resultJson;

    @Column(nullable = false)
    private LocalDateTime expiresAt;

    @Column(nullable = false)
    private LocalDateTime createdAt;

    @Builder
    private RecommendationCache(String cacheKey, String resultJson, LocalDateTime expiresAt) {
        this.cacheKey = cacheKey;
        this.resultJson = resultJson;
        this.expiresAt = expiresAt;
        this.createdAt = LocalDateTime.now();
    }

    public boolean isExpired(LocalDateTime now) {
        return now.isAfter(expiresAt);
    }

    public void refresh(String resultJson, LocalDateTime expiresAt) {
        this.resultJson = resultJson;
        this.expiresAt = expiresAt;
        this.createdAt = LocalDateTime.now();
    }
}
