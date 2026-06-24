package com.enjoytrip.backend.domain.mypage.dto;

/**
 * FR-MYPAGE: 내 여행 통계.
 * 내가 활성 멤버인 그룹을 상태별로 집계하고, 누적 여행 일수·방문 지역 수·담은 장소 수·내 결제 총액을 제공한다.
 */
public record MyStatsResponse(
        int inProgressTrips,   // 진행 중 여행 수
        int upcomingTrips,     // 예정 여행 수
        int completedTrips,    // 완료 여행 수
        int totalTrips,        // 전체 참여 여행 수
        long totalTripDays,    // 완료 여행의 누적 일수(시작~종료, 양끝 포함)
        int visitedRegions,    // 방문 지역(목적지) 고유 개수
        long bookmarkCount,    // 내가 담은 장소 수
        long totalSpending     // 내가 결제한 지출 총액(원)
) {
}
