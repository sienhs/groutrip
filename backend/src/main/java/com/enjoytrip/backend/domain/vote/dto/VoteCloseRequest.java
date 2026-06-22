package com.enjoytrip.backend.domain.vote.dto;

/**
 * FR-VOTE-03: 투표 마감/채택 요청.
 * candidateId가 있으면 해당 후보를 수동 채택하고, 없으면 최다 득표 후보를 자동 채택한다(동점 시 candidateId 필요).
 */
public record VoteCloseRequest(
        Long candidateId
) {
}
