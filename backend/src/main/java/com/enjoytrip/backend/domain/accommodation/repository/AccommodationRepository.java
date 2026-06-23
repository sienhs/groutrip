package com.enjoytrip.backend.domain.accommodation.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import com.enjoytrip.backend.domain.accommodation.entity.Accommodation;

public interface AccommodationRepository extends JpaRepository<Accommodation, Long> {

    // 목록 조회는 place를 함께 가져와 N+1을 피한다(예약 사진 blob은 LAZY라 로드하지 않음).
    @EntityGraph(attributePaths = "place")
    List<Accommodation> findByTravelGroupIdOrderByCreatedAtDesc(Long groupId);

    Optional<Accommodation> findByIdAndTravelGroupId(Long id, Long groupId);
}
