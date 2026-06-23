package com.enjoytrip.backend.domain.schedule.dto;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;

import com.enjoytrip.backend.domain.place.dto.PlaceResponse;
import com.enjoytrip.backend.domain.schedule.entity.Schedule;
import com.enjoytrip.backend.domain.schedule.entity.ScheduleStatus;
import com.enjoytrip.backend.domain.schedule.entity.TransportMode;

/**
 * FR-SCHEDULE: 일정 응답. 장소 정보와 일자/순서/시간/이동수단/상태/수정자 정보를 함께 노출한다.
 */
public record ScheduleResponse(
        Long id,
        PlaceResponse place,   // 빈 일정이면 null
        String title,          // 빈 일정의 사용자 제목(장소 기반 일정에선 null일 수 있음)
        LocalDate scheduleDate,
        int orderIndex,
        LocalTime startTime,
        LocalTime endTime,
        String memo,
        Long estimatedCost,
        TransportMode transportMode,
        ScheduleStatus status,
        Long createdById,
        String createdByName,
        Long updatedById,
        String updatedByName,
        LocalDateTime createdAt,
        LocalDateTime updatedAt
) {

    public static ScheduleResponse from(Schedule schedule, String photoUrl) {
        return new ScheduleResponse(
                schedule.getId(),
                schedule.getPlace() == null ? null : PlaceResponse.from(schedule.getPlace(), photoUrl),
                schedule.getTitle(),
                schedule.getScheduleDate(),
                schedule.getOrderIndex(),
                schedule.getStartTime(),
                schedule.getEndTime(),
                schedule.getMemo(),
                schedule.getEstimatedCost(),
                schedule.getTransportMode(),
                schedule.getStatus(),
                schedule.getCreatedBy().getId(),
                schedule.getCreatedBy().getName(),
                schedule.getUpdatedBy().getId(),
                schedule.getUpdatedBy().getName(),
                schedule.getCreatedAt(),
                schedule.getUpdatedAt()
        );
    }
}
