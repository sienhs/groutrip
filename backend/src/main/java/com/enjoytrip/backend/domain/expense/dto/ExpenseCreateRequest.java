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

// FR-EXPENSE-01/07: 지출 등록 요청이며, sourceScheduleId는 이동 비용 자동 등록 계약을 위한 선택값이다.
@Schema(description = "지출 등록 요청")
public record ExpenseCreateRequest(
        @Schema(description = "총 지출 금액. 1원 이상 100,000,000원 이하.", example = "12000")
        @NotNull @Min(1) @Max(100_000_000)
        Long amount,

        @Schema(description = "결제한 그룹 멤버의 사용자 ID.", example = "1")
        @NotNull
        Long payerId,

        @Schema(description = "지출 카테고리. MEAL, LODGING, TRANSPORT, TICKET, OTHER 중 하나.", example = "TRANSPORT")
        @NotNull
        ExpenseCategory category,

        @Schema(description = "분담 방식. 현재 구현은 EQUAL 균등 분담을 우선 지원한다.", example = "EQUAL")
        @NotNull
        SplitType splitType,

        @Schema(description = "지출 메모. 이동 비용 자동 등록이면 '[자동]' 문구를 포함할 수 있다.", example = "[자동] 강남역 → 홍대입구 자동차 이동")
        @Size(max = 255)
        String description,

        @Schema(description = "결제일.", example = "2026-07-01")
        @NotNull
        LocalDate paidAt,

        @Schema(description = "분담에 참여할 그룹 멤버 사용자 ID 목록.", example = "[1, 2, 3]")
        @NotEmpty
        List<Long> participantIds,

        @Schema(description = "일정/이동 비용에서 생성된 지출이면 원본 일정 ID. 직접 입력 지출이면 null 가능.", example = "42")
        Long sourceScheduleId
) {
}
