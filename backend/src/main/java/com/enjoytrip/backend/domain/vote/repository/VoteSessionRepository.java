package com.enjoytrip.backend.domain.vote.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import com.enjoytrip.backend.domain.vote.entity.VoteSession;
import com.enjoytrip.backend.domain.vote.entity.VoteStatus;

public interface VoteSessionRepository extends JpaRepository<VoteSession, Long> {

    // 그룹 범위로 세션을 조회한다(권한/스코프 검증).
    @EntityGraph(attributePaths = {"schedule", "createdBy"})
    Optional<VoteSession> findByIdAndTravelGroupId(Long id, Long groupId);

    // FR-VOTE-01: 한 일정에 OPEN 세션 중복 생성을 막는다.
    boolean existsByScheduleIdAndStatus(Long scheduleId, VoteStatus status);

    // 일정별 투표 세션 목록(최신순).
    @EntityGraph(attributePaths = {"schedule", "createdBy"})
    List<VoteSession> findByScheduleIdOrderByIdDesc(Long scheduleId);

    // FR-HOME-02: 내 그룹들의 진행 중(OPEN) 투표 수를 집계한다.
    long countByTravelGroupIdInAndStatus(List<Long> groupIds, VoteStatus status);
}
