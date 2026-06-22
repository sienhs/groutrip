package com.enjoytrip.backend.domain.schedule.dto;

import java.time.LocalDate;
import java.util.List;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;

/**
 * FR-SCHEDULE-03: 드래그 앤 드롭 reorder 요청.
 * 드래그 종료 시점에 변경된 모든 일정의 최종 (일자, 순서)를 한 번에 보낸다.
 * 같은 일자 순서 변경과 다른 일자로의 이동을 모두 표현한다.
 */
public record ScheduleReorderRequest(

        @NotEmpty
        @Valid
        List<Item> items
) {

    public record Item(

            @NotNull
            Long scheduleId,

            @NotNull
            LocalDate scheduleDate,

            @NotNull
            @PositiveOrZero
            Integer orderIndex
    ) {
    }
}
