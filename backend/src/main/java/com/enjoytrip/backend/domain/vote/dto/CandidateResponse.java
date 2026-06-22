package com.enjoytrip.backend.domain.vote.dto;

import java.util.List;

import com.enjoytrip.backend.domain.place.dto.PlaceResponse;

/**
 * FR-VOTE-04: 후보별 결과. 총점/투표 수와 실명 투표자 명단을 포함한다.
 */
public record CandidateResponse(
        Long id,
        PlaceResponse place,
        Long registeredById,
        String registeredByName,
        String memo,
        int totalScore,
        int voteCount,
        List<VoterScore> voters
) {

    public record VoterScore(
            Long userId,
            String name,
            int score
    ) {
    }
}
