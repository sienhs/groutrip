package com.enjoytrip.backend.domain.group.dto;

import java.time.LocalDate;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

// FR-GROUP-04: Owner가 그룹 기본 정보를 수정할 때 받는 요청 DTO다.
@Schema(description = "그룹 정보 수정 요청")
public record GroupUpdateRequest(
        @Schema(description = "수정할 그룹 제목. 1자 이상 30자 이하.", example = "제주도 여름 여행")
        @NotBlank @Size(min = 1, max = 30)
        String title,

        @Schema(description = "수정할 여행 목적지.", example = "제주도 서귀포")
        @NotBlank @Size(max = 100)
        String destination,

        @Schema(description = "수정할 여행 시작일. 여행 시작 전까지만 변경 가능하다.", example = "2026-07-02")
        @NotNull
        LocalDate startDate,

        @Schema(description = "수정할 여행 종료일. 시작일보다 빠를 수 없고 최대 30일 범위여야 한다.", example = "2026-07-06")
        @NotNull
        LocalDate endDate,

        @Schema(description = "수정할 커버 이미지 키. 기존 값을 유지하려면 현재 값을 그대로 보낸다.", example = "cover-jeju-02")
        String coverImageKey
) {
}
