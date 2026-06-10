package com.enjoytrip.backend.domain.expense.dto;

import java.time.LocalDate;
import java.util.List;

import com.enjoytrip.backend.domain.expense.entity.ExpenseCategory;
import com.enjoytrip.backend.domain.expense.entity.SplitType;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

// FR-EXPENSE-01/07: 지출 등록 요청이며, sourceScheduleId는 이동 비용 자동 등록 계약을 위해 선택값으로 둔다.
public record ExpenseCreateRequest(
        @NotNull @Min(1) @Max(100_000_000)
        Long amount,

        @NotNull
        Long payerId,

        @NotNull
        ExpenseCategory category,

        @NotNull
        SplitType splitType,

        @Size(max = 255)
        String description,

        @NotNull
        LocalDate paidAt,

        @NotEmpty
        List<Long> participantIds,

        Long sourceScheduleId
) {
}
