package com.enjoytrip.backend.domain.schedule.entity;

/**
 * FR-SCHEDULE-04: 일정 간 이동 수단. 사용자가 탭으로 선택한 값을 schedule.transport_mode에 저장한다.
 */
public enum TransportMode {
    CAR,      // 자동차 (톨비 + 연료비, 택시비 별도)
    TRANSIT,  // 대중교통 (운임 + 환승)
    WALK      // 도보 (시간/거리만)
}
