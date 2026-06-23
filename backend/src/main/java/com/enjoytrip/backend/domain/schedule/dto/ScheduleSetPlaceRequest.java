package com.enjoytrip.backend.domain.schedule.dto;

import jakarta.validation.constraints.NotNull;

/**
 * FR-VOTE-03 대안: 빈 일정의 장소를 Owner가 투표 없이 직접 확정할 때 사용.
 */
public record ScheduleSetPlaceRequest(
        @NotNull Long placeId
) {
}
