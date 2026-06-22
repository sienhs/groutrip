package com.enjoytrip.backend.domain.vote.dto;

import java.time.LocalDateTime;
import java.util.List;

import com.enjoytrip.backend.domain.vote.entity.VoteStatus;

/**
 * FR-VOTE-04: 투표 세션 결과 응답. 후보별 득점과 현재 사용자의 투표 여부를 포함한다.
 */
public record VoteSessionResponse(
        Long id,
        Long scheduleId,
        String title,
        VoteStatus status,
        LocalDateTime closesAt,
        Long createdById,
        Long winnerCandidateId,
        boolean hasVoted,             // 현재 사용자가 이 세션에서 한 표라도 행사했는지
        List<CandidateResponse> candidates
) {
}
