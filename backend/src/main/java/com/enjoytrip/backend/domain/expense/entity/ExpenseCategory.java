package com.enjoytrip.backend.domain.expense.entity;

// FR-EXPENSE-01: 지출 항목을 SRS의 식비/숙박/교통/입장료/기타 범주로 분류한다.
public enum ExpenseCategory {
    MEAL,
    LODGING,
    TRANSPORT,
    TICKET,
    OTHER
}
