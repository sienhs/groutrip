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

// FR-EXPENSE-03: 지출 수정 시 지출 기본 정보와 분담 참여자를 다시 받는다.
public record ExpenseUpdateRequest(
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
