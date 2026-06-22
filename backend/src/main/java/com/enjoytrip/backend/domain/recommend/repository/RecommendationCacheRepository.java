package com.enjoytrip.backend.domain.recommend.repository;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.enjoytrip.backend.domain.recommend.entity.RecommendationCache;

public interface RecommendationCacheRepository extends JpaRepository<RecommendationCache, Long> {

    // EI-03: (지역 + 카테고리) 24시간 캐시 조회.
    Optional<RecommendationCache> findByCacheKey(String cacheKey);
}
