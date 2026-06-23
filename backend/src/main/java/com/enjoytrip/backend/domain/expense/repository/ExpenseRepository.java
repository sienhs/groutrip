package com.enjoytrip.backend.domain.expense.repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.enjoytrip.backend.domain.expense.entity.Expense;
import com.enjoytrip.backend.domain.expense.entity.ExpenseCategory;

public interface ExpenseRepository extends JpaRepository<Expense, Long> {

    // FR-EXPENSE-02: 그룹의 삭제되지 않은 지출을 결제일 최신순으로 조회한다.
    @EntityGraph(attributePaths = {"travelGroup", "payer", "createdBy"})
    List<Expense> findByTravelGroupIdAndDeletedAtIsNullOrderByPaidAtDescIdDesc(Long groupId);

    // FR-EXPENSE-02: 선택된 카테고리, 결제자, 날짜 범위를 DB에서 필터링한다.
    @EntityGraph(attributePaths = {"travelGroup", "payer", "createdBy"})
    @Query("""
            SELECT expense
            FROM Expense expense
            WHERE expense.travelGroup.id = :groupId
              AND expense.deletedAt IS NULL
              AND (:category IS NULL OR expense.category = :category)
              AND (:payerId IS NULL OR expense.payer.id = :payerId)
              AND (:startDate IS NULL OR expense.paidAt >= :startDate)
              AND (:endDate IS NULL OR expense.paidAt <= :endDate)
            ORDER BY expense.paidAt DESC, expense.id DESC
            """)
    List<Expense> findAllByFilters(
            @Param("groupId") Long groupId,
            @Param("category") ExpenseCategory category,
            @Param("payerId") Long payerId,
            @Param("startDate") LocalDate startDate,
            @Param("endDate") LocalDate endDate
    );

    // FR-EXPENSE-03: 수정/삭제 대상 지출이 해당 그룹에 속하고 삭제되지 않았는지 확인한다.
    @EntityGraph(attributePaths = {"travelGroup", "payer", "createdBy"})
    Optional<Expense> findByIdAndTravelGroupIdAndDeletedAtIsNull(Long id, Long groupId);

    void deleteByTravelGroupId(Long groupId);

    // FR-MYPAGE: 내가 결제한 지출 총액(여행 통계). 삭제된 지출은 제외한다.
    @Query("""
            SELECT COALESCE(SUM(expense.amount), 0)
            FROM Expense expense
            WHERE expense.payer.id = :userId
              AND expense.deletedAt IS NULL
            """)
    long sumAmountByPayerId(@Param("userId") Long userId);
}
