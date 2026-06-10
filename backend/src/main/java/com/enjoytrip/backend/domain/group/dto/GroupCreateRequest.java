package com.enjoytrip.backend.domain.group.dto;

import java.time.LocalDate;

import jakarta.validation.constraints.FutureOrPresent;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

// FR-GROUP-01: 그룹 생성 요청에서 필요한 기본 여행 정보를 받는다.
public record GroupCreateRequest(
        @NotBlank @Size(min = 1, max = 30)
        String title,

        @NotBlank @Size(max = 100)
        String destination,

        @NotNull @FutureOrPresent
        LocalDate startDate,

        @NotNull @FutureOrPresent
        LocalDate endDate,

        String coverImageKey
) {
}
