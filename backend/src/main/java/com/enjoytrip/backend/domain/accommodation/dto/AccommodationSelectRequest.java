package com.enjoytrip.backend.domain.accommodation.dto;

import java.time.LocalDate;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * 숙소 선정 요청. Google placeId로 숙소를 확정하며, sigungu는 추천/맥락용(선택),
 * stayDate는 날짜별 숙소 선택 시 숙박일(선택)이다.
 */
public record AccommodationSelectRequest(
        @NotBlank String googlePlaceId,
        @Size(max = 100) String sigungu,
        LocalDate stayDate
) {
}
