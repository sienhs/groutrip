package com.enjoytrip.backend.domain.place.dto;

import com.enjoytrip.backend.domain.place.entity.PlaceCategory;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

/**
 * FR-PLACE-04: 보관함 항목 수정 요청. 카테고리 태그/메모/개인 별점만 변경 가능하다.
 */
public record BookmarkUpdateRequest(

        @NotNull
        PlaceCategory categoryTag,

        @Size(max = 500)
        String memo,

        @Min(1)
        @Max(5)
        Integer personalRating
) {
}
