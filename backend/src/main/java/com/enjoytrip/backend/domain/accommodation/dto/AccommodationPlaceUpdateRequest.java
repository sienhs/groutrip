package com.enjoytrip.backend.domain.accommodation.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * 숙소 장소 재선택(상세주소 변경) 요청. Google placeId로 다른 숙소/장소로 교체한다.
 * 숙박 일자·예약 상태·예약완료 사진은 그대로 유지한다.
 */
public record AccommodationPlaceUpdateRequest(
        @NotBlank String googlePlaceId,
        @Size(max = 100) String sigungu
) {
}
