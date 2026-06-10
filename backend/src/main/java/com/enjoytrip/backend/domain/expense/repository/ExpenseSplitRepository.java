package com.enjoytrip.backend.domain.expense.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

import com.enjoytrip.backend.domain.expense.entity.ExpenseSplit;

public interface ExpenseSplitRepository extends JpaRepository<ExpenseSplit, Long> {

    // FR-EXPENSE-01/02: 지출 응답에 포함할 참여자별 부담 금액을 조회한다.
    List<ExpenseSplit> findByExpenseId(Long expenseId);
}
