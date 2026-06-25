package com.enjoytrip.backend.domain.schedule.dto;

import java.util.List;

/**
 * 두 일정 사이의 자동차 이동 경로(도로 좌표열) 응답.
 * path 의 각 원소는 [위도, 경도]. 길찾기 실패/미지원이면 available=false + 빈 path.
 */
public record TransportPathResponse(
        boolean available,
        List<double[]> path
) {
    public static TransportPathResponse unavailable() {
        return new TransportPathResponse(false, List.of());
    }
}
