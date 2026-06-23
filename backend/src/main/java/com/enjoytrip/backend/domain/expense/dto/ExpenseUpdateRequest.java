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

        @Schema(description = "수정할 분담 방식. EQUAL, RATIO, AMOUNT 중 하나.", example = "EQUAL")
        @NotNull
        SplitType splitType,

        @Schema(description = "수정할 지출 메모.", example = "저녁 식사")
        @Size(max = 255)
        String description,

        @Schema(description = "수정할 메모(항목과 별개의 자유 메모).", example = "1인 2만원씩")
        @Size(max = 255)
        String memo,

        @Schema(description = "수정할 결제일.", example = "2026-07-01")
        @NotNull
        LocalDate paidAt,

        @Schema(description = "EQUAL 방식의 참여자 ID 목록. RATIO/AMOUNT 방식에서는 비워둔다.", example = "[1, 2, 3]")
        List<Long> participantIds,

        @Schema(description = "RATIO/AMOUNT 방식의 참여자별 분담 상세. EQUAL 방식에서는 비워둔다.")
        List<@Valid ExpenseSplitRequest> splitDetails,

        @Schema(description = "원본 일정 ID. 일정 연동 지출이 아니면 null 가능.", example = "42")
        Long sourceScheduleId
) {
    // 기존 EQUAL 호출부와의 소스 호환을 유지한다.
    public ExpenseUpdateRequest(
            Long amount,
            Long payerId,
            ExpenseCategory category,
            SplitType splitType,
            String description,
            LocalDate paidAt,
            List<Long> participantIds,
            Long sourceScheduleId
    ) {
        this(amount, payerId, category, splitType, description, null, paidAt, participantIds, null, sourceScheduleId);
    }
}
