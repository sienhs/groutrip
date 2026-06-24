package com.enjoytrip.backend.global.event;

// FR-SSE-02: Part A/B 도메인이 발행하고 SSE 브리지에서 전파할 그룹 단위 이벤트 종류다.
public enum EventType {
    SCHEDULE_ADDED,
    SCHEDULE_UPDATED,
    SCHEDULE_DELETED,
    SCHEDULE_REORDERED,

    VOTE_CAST,
    VOTE_CLOSED,

    PLACE_BOOKMARKED,
    PLACE_REMOVED,

    EXPENSE_ADDED,
    EXPENSE_UPDATED,
    EXPENSE_DELETED,

    // 정산 시작/송금완료/수령확인 등 정산 상태 변화(그룹 전체 실시간 갱신용).
    SETTLEMENT_UPDATED,

    MEMBER_JOINED,
    MEMBER_LEFT,
    GROUP_UPDATED
}
