package com.enjoytrip.backend.domain.vote.entity;

/**
 * FR-VOTE-03: 투표 세션 상태.
 */
public enum VoteStatus {
    OPEN,   // 투표 진행 중
    CLOSED  // 마감/채택 완료
}
