package com.enjoytrip.backend.domain.schedule.repository;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.enjoytrip.backend.domain.schedule.entity.TransportLeg;

public interface TransportLegRepository extends JpaRepository<TransportLeg, Long> {

    // EI-02-D: (출발지, 도착지, 수단) 1시간 캐시 조회.
    Optional<TransportLeg> findByCacheKey(String cacheKey);
}
