package com.enjoytrip.backend.domain.schedule.dto;

import java.time.LocalTime;

import com.enjoytrip.backend.domain.schedule.entity.ScheduleStatus;
import com.enjoytrip.backend.domain.schedule.entity.TransportMode;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;

/**
 * FR-SCHEDULE-02: 일정 수정 요청.
 * 일자/순서 변경은 드래그 reorder API로 처리하므로 여기서는 시간·메모·비용·이동수단·상태만 수정한다.
 */
public record ScheduleUpdateRequest(

        @NotNull
        LocalTime startTime,

        @NotNull
        LocalTime endTime,

        @Size(max = 500)
        String memo,

        @PositiveOrZero
        Long estimatedCost,

        TransportMode transportMode,

        ScheduleStatus status
) {
}
