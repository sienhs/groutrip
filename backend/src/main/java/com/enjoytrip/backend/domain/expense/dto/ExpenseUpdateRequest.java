package com.enjoytrip.backend.domain.expense.dto;

import java.time.LocalDate;
import java.util.List;

import com.enjoytrip.backend.domain.expense.entity.ExpenseCategory;
import com.enjoytrip.backend.domain.expense.entity.SplitType;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

// FR-EXPENSE-03: 지출 수정 요청이며, 수정 시 분담 참여자 목록도 다시 계산한다.
@Schema(description = "지출 수정 요청")
public record ExpenseUpdateRequest(
        @Schema(description = "수정할 총 지출 금액. 1원 이상 100,000,000원 이하.", example = "15000")
        @NotNull @Min(1) @Max(100_000_000)
        Long amount,

        @Schema(description = "수정할 결제자 사용자 ID. 그룹의 활성 멤버여야 한다.", example = "1")
        @NotNull
        Long payerId,

        @Schema(description = "수정할 지출 카테고리.", example = "MEAL")
        @NotNull
        ExpenseCategory category,

        @Schema(description = "수정할 분담 방식. 현재 구현은 EQUAL 균등 분담을 우선 지원한다.", example = "EQUAL")
        @NotNull
        SplitType splitType,

        @Schema(description = "수정할 지출 메모.", example = "저녁 식사")
        @Size(max = 255)
        String description,

        @Schema(description = "수정할 결제일.", example = "2026-07-01")
        @NotNull
        LocalDate paidAt,

        @Schema(description = "수정할 분담 참여자 사용자 ID 목록.", example = "[1, 2, 3]")
        @NotEmpty
        List<Long> participantIds,

        @Schema(description = "원본 일정 ID. 일정 연동 지출이 아니면 null 가능.", example = "42")
        Long sourceScheduleId
) {
}
