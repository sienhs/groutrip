package com.enjoytrip.backend.domain.expense.dto;

import com.enjoytrip.backend.domain.expense.entity.ExpenseCategory;

// FR-EXPENSE-02: 도넛 차트에 사용할 카테고리별 지출 합계이다.
public record ExpenseCategoryTotalResponse(
        ExpenseCategory category,
        Long amount
) {
}
