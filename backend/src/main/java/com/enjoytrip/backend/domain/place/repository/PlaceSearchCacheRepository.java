package com.enjoytrip.backend.domain.place.repository;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.enjoytrip.backend.domain.place.entity.PlaceSearchCache;

public interface PlaceSearchCacheRepository extends JpaRepository<PlaceSearchCache, Long> {

    // FR-PLACE-01: 동일 (검색어+카테고리+지역) 조합의 24시간 캐시를 조회한다.
    Optional<PlaceSearchCache> findByCacheKey(String cacheKey);
}
