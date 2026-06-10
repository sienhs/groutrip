package com.enjoytrip.backend.domain.expense.dto;

import com.enjoytrip.backend.domain.expense.entity.ExpenseSplit;

// FR-EXPENSE-01: 지출별 참여자가 부담해야 하는 금액을 응답한다.
public record ExpenseSplitResponse(
        Long userId,
        String name,
        Long owedAmount
) {
    public static ExpenseSplitResponse from(ExpenseSplit split) {
        return new ExpenseSplitResponse(
                split.getUser().getId(),
                split.getUser().getName(),
                split.getOwedAmount()
        );
    }
}
