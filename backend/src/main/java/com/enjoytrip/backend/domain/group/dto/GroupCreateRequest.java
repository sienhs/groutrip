package com.enjoytrip.backend.domain.group.dto;

import java.time.LocalDate;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.FutureOrPresent;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

// FR-GROUP-01: 그룹 생성 요청에서 필요한 기본 여행 정보를 받는다.
@Schema(description = "그룹 생성 요청")
public record GroupCreateRequest(
        @Schema(description = "그룹 제목. 1자 이상 30자 이하.", example = "제주도 우정 여행")
        @NotBlank @Size(min = 1, max = 30)
        String title,

        @Schema(description = "여행 목적지. 도시, 지역, 국가 등을 입력한다.", example = "제주도")
        @NotBlank @Size(max = 100)
        String destination,

        @Schema(description = "여행 시작일. 오늘 이후 날짜여야 한다.", example = "2026-07-01")
        @NotNull @FutureOrPresent
        LocalDate startDate,

        @Schema(description = "여행 종료일. 시작일보다 빠를 수 없고 최대 30일 범위여야 한다.", example = "2026-07-05")
        @NotNull @FutureOrPresent
        LocalDate endDate,

        @Schema(description = "선택한 그룹 커버 이미지 키. 아직 이미지 선택이 없으면 null 가능.", example = "cover-jeju-01")
        String coverImageKey
) {
}
