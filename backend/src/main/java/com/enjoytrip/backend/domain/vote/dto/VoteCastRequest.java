package com.enjoytrip.backend.domain.vote.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

/**
 * FR-VOTE-02: 후보에 1~5점을 부여하는 투표 요청. 재투표 시 점수가 갱신된다.
 */
public record VoteCastRequest(

        @NotNull
        Long candidateId,

        @NotNull
        @Min(1)
        @Max(5)
        Integer score
) {
}
