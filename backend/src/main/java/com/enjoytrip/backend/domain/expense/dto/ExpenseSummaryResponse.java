package com.enjoytrip.backend.domain.expense.dto;

import java.util.List;

// FR-EXPENSE-02: 현재 필터 조건에 해당하는 지출의 합계와 차트 데이터를 제공한다.
public record ExpenseSummaryResponse(
        Long totalExpenseAmount,
        Long averagePerMemberAmount,
        List<ExpenseCategoryTotalResponse> categoryTotals,
        List<ExpenseDailyTotalResponse> dailyTotals
) {
}
