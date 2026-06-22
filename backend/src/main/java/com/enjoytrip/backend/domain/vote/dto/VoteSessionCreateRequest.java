package com.enjoytrip.backend.domain.vote.dto;

import java.time.LocalDateTime;

import jakarta.validation.constraints.Size;

/**
 * FR-VOTE-01: 일정 슬롯에 대한 투표 세션 생성 요청. 제목/마감 시각은 선택이다.
 */
public record VoteSessionCreateRequest(

        @Size(max = 100)
        String title,

        LocalDateTime closesAt
) {
}
