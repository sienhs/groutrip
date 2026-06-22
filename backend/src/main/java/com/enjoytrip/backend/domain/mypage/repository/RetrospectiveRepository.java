package com.enjoytrip.backend.domain.mypage.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import com.enjoytrip.backend.domain.mypage.entity.Retrospective;

public interface RetrospectiveRepository extends JpaRepository<Retrospective, Long> {

    // FR-MYPAGE-04: 특정 그룹에 대한 내 회고(그룹·사용자당 1건).
    @EntityGraph(attributePaths = {"travelGroup"})
    Optional<Retrospective> findByTravelGroupIdAndUserId(Long groupId, Long userId);

    // FR-MYPAGE-04: 내 여행 기록(회고) 모음(최신순). 본인만 조회한다.
    @EntityGraph(attributePaths = {"travelGroup"})
    List<Retrospective> findByUserIdOrderByCreatedAtDesc(Long userId);
}
