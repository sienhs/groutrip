package com.enjoytrip.backend.domain.mypage.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

/**
 * FR-MYPAGE-04: 회고 작성/수정 요청(한 줄 후기 + 별점).
 */
public record RetrospectiveRequest(

        @NotBlank
        @Size(max = 200)
        String content,

        @NotNull
        @Min(1)
        @Max(5)
        Integer rating
) {
}
