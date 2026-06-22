package com.enjoytrip.backend.domain.place.dto;

import com.enjoytrip.backend.domain.place.entity.PlaceCategory;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

/**
 * FR-PLACE-02: 보관함 추가 요청.
 * 검색 결과의 Google placeId만 받고, 상세 정보는 BE가 추가 시점에 Place Details로 보강한다.
 */
public record BookmarkCreateRequest(

        @NotBlank
        String googlePlaceId,

        @NotNull
        PlaceCategory categoryTag,

        @Size(max = 500)
        String memo,

        @Min(1)
        @Max(5)
        Integer personalRating
) {
}
