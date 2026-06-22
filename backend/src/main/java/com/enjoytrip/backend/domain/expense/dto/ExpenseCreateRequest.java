package com.enjoytrip.backend.domain.expense.dto;

import java.time.LocalDate;
import java.util.List;

import com.enjoytrip.backend.domain.expense.entity.ExpenseCategory;
import com.enjoytrip.backend.domain.expense.entity.SplitType;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import jakarta.validation.Valid;

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

        @Schema(description = "분담 방식. EQUAL, RATIO, AMOUNT 중 하나.", example = "EQUAL")
        @NotNull
        SplitType splitType,

        @Schema(description = "지출 메모. 이동 비용 자동 등록이면 '[자동]' 문구를 포함할 수 있다.", example = "[자동] 강남역 → 홍대입구 자동차 이동")
        @Size(max = 255)
        String description,

        @Schema(description = "결제일.", example = "2026-07-01")
        @NotNull
        LocalDate paidAt,

        @Schema(description = "EQUAL 방식의 참여자 ID 목록. RATIO/AMOUNT 방식에서는 비워둔다.", example = "[1, 2, 3]")
        List<Long> participantIds,

        @Schema(description = "RATIO/AMOUNT 방식의 참여자별 분담 상세. EQUAL 방식에서는 비워둔다.")
        List<@Valid ExpenseSplitRequest> splitDetails,

        @Schema(description = "일정/이동 비용에서 생성된 지출이면 원본 일정 ID. 직접 입력 지출이면 null 가능.", example = "42")
        Long sourceScheduleId
) {
    // 기존 EQUAL 호출부와의 소스 호환을 유지한다.
    public ExpenseCreateRequest(
            Long amount,
            Long payerId,
            ExpenseCategory category,
            SplitType splitType,
            String description,
            LocalDate paidAt,
            List<Long> participantIds,
            Long sourceScheduleId
    ) {
        this(amount, payerId, category, splitType, description, paidAt, participantIds, null, sourceScheduleId);
    }
}
