package com.enjoytrip.backend.domain.schedule.dto;

import java.time.LocalDate;
import java.time.LocalTime;

import com.enjoytrip.backend.domain.schedule.entity.TransportMode;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;

/**
 * FR-SCHEDULE-01: 일정 추가 요청.
 * placeId는 그룹 보관함/마스터에 존재하는 장소를 가리킨다. 순서(orderIndex)는 서버가 해당 일자 끝에 배치한다.
 */
public record ScheduleCreateRequest(

        @NotNull
        Long placeId,

        @NotNull
        LocalDate scheduleDate,

        @NotNull
        LocalTime startTime,

        @NotNull
        LocalTime endTime,

        @Size(max = 500)
        String memo,

        @PositiveOrZero
        Long estimatedCost,

        TransportMode transportMode
) {
}
