package com.enjoytrip.backend.domain.expense.repository;

import java.util.List;

import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.enjoytrip.backend.domain.expense.entity.ExpenseSplit;

public interface ExpenseSplitRepository extends JpaRepository<ExpenseSplit, Long> {

    // FR-EXPENSE-01/02: 지출 응답에 포함할 참여자별 부담 금액을 조회한다.
    @EntityGraph(attributePaths = {"expense", "user"})
    List<ExpenseSplit> findByExpenseId(Long expenseId);

    // FR-EXPENSE-04: 정산 매트릭스 계산을 위해 여러 지출의 분담 결과를 한 번에 조회한다.
    @EntityGraph(attributePaths = {"expense", "user"})
    List<ExpenseSplit> findByExpenseIdIn(List<Long> expenseIds);

    // FR-EXPENSE-03: 지출 수정 시 기존 분담 결과를 지우고 다시 계산한다.
    void deleteByExpenseId(Long expenseId);

    @Modifying
    @Query("DELETE FROM ExpenseSplit split WHERE split.expense.travelGroup.id = :groupId")
    void deleteByTravelGroupId(@Param("groupId") Long groupId);

    /**
     * 이미 그룹을 떠났는데(leftAt) 아직 활성 지출의 분담 대상으로 남아 있는 (groupId, userId) 쌍.
     * 예전에 강퇴돼 정리되지 못한 데이터를 부팅 시 자가 치유하는 데 쓴다.
     */
    @Query("""
            SELECT DISTINCT split.expense.travelGroup.id, split.user.id
            FROM ExpenseSplit split, GroupMember member
            WHERE member.travelGroup.id = split.expense.travelGroup.id
              AND member.user.id = split.user.id
              AND member.leftAt IS NOT NULL
              AND split.expense.deletedAt IS NULL
            """)
    List<Object[]> findLeftMemberSplitTargets();
}
