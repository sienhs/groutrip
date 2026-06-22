package com.enjoytrip.backend.domain.vote.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import com.enjoytrip.backend.domain.vote.entity.VoteCandidate;

public interface VoteCandidateRepository extends JpaRepository<VoteCandidate, Long> {

    // FR-VOTE-04: 세션의 후보 목록(장소/등록자 함께 로딩).
    @EntityGraph(attributePaths = {"place", "registeredBy"})
    List<VoteCandidate> findByVoteSessionIdOrderByIdAsc(Long voteSessionId);

    // FR-VOTE-01: 멤버당 후보 등록 개수 제한(1~5) 검증용.
    long countByVoteSessionIdAndRegisteredById(Long voteSessionId, Long userId);

    // 투표 대상 후보를 세션 범위로 조회한다.
    Optional<VoteCandidate> findByIdAndVoteSessionId(Long id, Long voteSessionId);
}
