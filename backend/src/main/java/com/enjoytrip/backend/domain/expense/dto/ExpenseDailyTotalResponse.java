package com.enjoytrip.backend.domain.expense.dto;

import java.time.LocalDate;

// FR-EXPENSE-02: 라인 차트에 사용할 결제일별 지출 합계이다.
public record ExpenseDailyTotalResponse(
        LocalDate date,
        Long amount
) {
}
