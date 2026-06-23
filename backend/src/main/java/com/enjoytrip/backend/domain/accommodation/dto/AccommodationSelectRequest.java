package com.enjoytrip.backend.domain.accommodation.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * 숙소 선정 요청. Google placeId로 숙소를 확정하며, sigungu는 추천/맥락용(선택)이다.
 */
public record AccommodationSelectRequest(
        @NotBlank String googlePlaceId,
        @Size(max = 100) String sigungu
) {
}
