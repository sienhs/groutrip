package com.enjoytrip.backend.domain.expense.dto;

import java.time.LocalDate;
import java.util.List;

import com.enjoytrip.backend.domain.expense.entity.Expense;
import com.enjoytrip.backend.domain.expense.entity.ExpenseCategory;
import com.enjoytrip.backend.domain.expense.entity.ExpenseSplit;
import com.enjoytrip.backend.domain.expense.entity.SplitType;

// FR-EXPENSE-01/02: 지출 기본 정보와 분담 결과를 함께 내려주는 응답 DTO이다.
public record ExpenseResponse(
        Long id,
        Long groupId,
        Long payerId,
        String payerName,
        Long createdByUserId,
        Long amount,
        ExpenseCategory category,
        SplitType splitType,
        String description,
        String memo,
        LocalDate paidAt,
        Long sourceScheduleId,
        List<ExpenseSplitResponse> splits
) {
    public static ExpenseResponse from(Expense expense, List<ExpenseSplit> splits) {
        return new ExpenseResponse(
                expense.getId(),
                expense.getTravelGroup().getId(),
                expense.getPayer().getId(),
                expense.getPayer().getName(),
                expense.getCreatedBy().getId(),
                expense.getAmount(),
                expense.getCategory(),
                expense.getSplitType(),
                expense.getDescription(),
                expense.getMemo(),
                expense.getPaidAt(),
                expense.getSourceScheduleId(),
                splits.stream()
                        .map(ExpenseSplitResponse::from)
                        .toList()
        );
    }
}
