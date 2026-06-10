package com.enjoytrip.backend.domain.group.dto;

import java.time.LocalDate;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

// FR-GROUP-04: Owner가 그룹 기본 정보를 수정할 때 받는 요청 DTO이다.
public record GroupUpdateRequest(
        @NotBlank @Size(min = 1, max = 30)
        String title,

        @NotBlank @Size(max = 100)
        String destination,

        @NotNull
        LocalDate startDate,

        @NotNull
        LocalDate endDate,

        String coverImageKey
) {
}
