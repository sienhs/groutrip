package com.enjoytrip.backend.domain.accommodation.entity;

/**
 * 그룹 숙소 선정/예약 상태.
 * SELECTED: 숙소를 골랐고 예약 핸드오프(최저가 사이트) 단계.
 * BOOKED: 사용자가 외부 예약을 마치고 예약가 또는 예약완료 사진을 입력한 상태.
 */
public enum BookingStatus {
    SELECTED,
    BOOKED
}
