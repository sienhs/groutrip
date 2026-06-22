package com.enjoytrip.backend.domain.schedule.dto;

import com.enjoytrip.backend.domain.schedule.entity.TransportLeg;
import com.enjoytrip.backend.domain.schedule.entity.TransportMode;

/**
 * FR-SCHEDULE-04: 이동 정보 카드 응답(수단별).
 * 자동차: 시간/거리/톨비/연료비/자동차합계/택시비. 대중교통: 운임/환승/노선. 도보: 시간/거리.
 * {@code carCost}는 톨비+연료비 합계다. 대중교통 미지원 시 available=false + note.
 */
public record TransportLegResponse(
        TransportMode mode,
        boolean available,
        Integer durationMinutes,
        Integer distanceMeters,
        Integer toll,
        Integer fuelCost,
        Integer carCost,
        Integer taxiFare,
        Integer transitFare,
        Integer transferCount,
        String routeSummary,
        String note
) {

    public static TransportLegResponse from(TransportLeg leg) {
        Integer carCost = (leg.getToll() != null && leg.getFuelCost() != null)
                ? leg.getToll() + leg.getFuelCost()
                : null;
        Integer durationMinutes = leg.getDurationSeconds() == null
                ? null
                : Math.round(leg.getDurationSeconds() / 60.0f);
        return new TransportLegResponse(
                leg.getMode(),
                leg.isAvailable(),
                durationMinutes,
                leg.getDistanceMeters(),
                leg.getToll(),
                leg.getFuelCost(),
                carCost,
                leg.getTaxiFare(),
                leg.getTransitFare(),
                leg.getTransferCount(),
                leg.getRouteSummary(),
                leg.getNote()
        );
    }
}
