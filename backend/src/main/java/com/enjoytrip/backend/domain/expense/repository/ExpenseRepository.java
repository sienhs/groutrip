package com.enjoytrip.backend.domain.expense.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.enjoytrip.backend.domain.expense.entity.Expense;

public interface ExpenseRepository extends JpaRepository<Expense, Long> {

    // FR-EXPENSE-02: 그룹의 삭제되지 않은 지출을 결제일 최신순으로 조회한다.
    List<Expense> findByTravelGroupIdAndDeletedAtIsNullOrderByPaidAtDescIdDesc(Long groupId);

    // FR-EXPENSE-03: 수정/삭제 대상 지출이 해당 그룹에 속하고 삭제되지 않았는지 확인한다.
    Optional<Expense> findByIdAndTravelGroupIdAndDeletedAtIsNull(Long id, Long groupId);
}
