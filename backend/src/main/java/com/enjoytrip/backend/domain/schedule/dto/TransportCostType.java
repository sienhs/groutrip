package com.enjoytrip.backend.domain.schedule.dto;

/**
 * FR-EXPENSE-07: 이동 비용을 정산에 등록할 때 어떤 비용으로 등록할지 선택한다.
 */
public enum TransportCostType {
    DRIVING, // 자동차: 톨비 + 연료비 합계 (단일 지출)
    TAXI,    // 택시: 예상 택시비 (단일 지출)
    TRANSIT  // 대중교통: 운임 × 참여 인원
}
