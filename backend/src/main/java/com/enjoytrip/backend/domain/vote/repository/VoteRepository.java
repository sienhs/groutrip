package com.enjoytrip.backend.domain.vote.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import com.enjoytrip.backend.domain.vote.entity.Vote;

public interface VoteRepository extends JpaRepository<Vote, Long> {

    // FR-VOTE-02: 재투표 시 점수 갱신을 위해 (후보, 투표자) 기존 표를 조회한다.
    Optional<Vote> findByCandidateIdAndVoterId(Long candidateId, Long voterId);

    // FR-VOTE-04: 후보별 득점/투표자 집계용. 투표자를 함께 로딩한다.
    @EntityGraph(attributePaths = {"voter", "candidate"})
    List<Vote> findByCandidateIdIn(List<Long> candidateIds);
}
