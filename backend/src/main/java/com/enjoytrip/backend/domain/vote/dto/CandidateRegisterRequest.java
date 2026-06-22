package com.enjoytrip.backend.domain.vote.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

/**
 * FR-VOTE-01: 후보 장소 등록 요청. placeId는 보관함/마스터의 장소를 가리킨다.
 */
public record CandidateRegisterRequest(

        @NotNull
        Long placeId,

        @Size(max = 500)
        String memo
) {
}
