package com.enjoytrip.backend.domain.schedule.entity;

/**
 * FR-SCHEDULE-06: 일정 상태.
 * VOTING 전이는 투표 도메인(FR-VOTE)에서, CANCELLED는 사용자 액션으로 발생한다.
 */
public enum ScheduleStatus {
    PLANNED,   // 기본
    VOTING,    // 후보 투표 중
    CANCELLED  // 취소됨
}
