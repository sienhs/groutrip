package com.enjoytrip.backend.domain.settlement.service;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.enjoytrip.backend.domain.auth.entity.User;
import com.enjoytrip.backend.domain.expense.entity.Expense;
import com.enjoytrip.backend.domain.expense.entity.ExpenseSplit;
import com.enjoytrip.backend.domain.expense.repository.ExpenseRepository;
import com.enjoytrip.backend.domain.expense.repository.ExpenseSplitRepository;
import com.enjoytrip.backend.domain.group.entity.GroupMember;
import com.enjoytrip.backend.domain.group.repository.GroupMemberRepository;
import com.enjoytrip.backend.domain.group.service.CurrentUserResolver;
import com.enjoytrip.backend.domain.group.service.GroupAccessValidator;
import com.enjoytrip.backend.domain.settlement.dto.SettlementBalanceResponse;
import com.enjoytrip.backend.domain.settlement.dto.SettlementSummaryResponse;
import com.enjoytrip.backend.domain.settlement.dto.SettlementTransferResponse;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class SettlementService {

    private final ExpenseRepository expenseRepository;
    private final ExpenseSplitRepository expenseSplitRepository;
    private final GroupMemberRepository groupMemberRepository;
    private final CurrentUserResolver currentUserResolver;
    private final GroupAccessValidator groupAccessValidator;
    private final SettlementCalculator settlementCalculator;

    /**
     * FR-EXPENSE-04: 정산 매트릭스 조회.
     * 멤버별 잔액은 낸 돈에서 부담해야 할 돈을 뺀 값으로 계산한다.
     */
    public SettlementSummaryResponse calculate(Long groupId) {
        User user = currentUserResolver.getCurrentUser();
        groupAccessValidator.validateMember(groupId, user.getId());

        List<Expense> expenses = expenseRepository.findByTravelGroupIdAndDeletedAtIsNullOrderByPaidAtDescIdDesc(groupId);
        List<Long> expenseIds = expenses.stream()
                .map(Expense::getId)
                .toList();
        List<ExpenseSplit> splits = expenseIds.isEmpty()
                ? List.of()
                : expenseSplitRepository.findByExpenseIdIn(expenseIds);

        Map<Long, BalanceAccumulator> balances = createInitialBalances(groupId);
        long totalExpenseAmount = 0L;

        for (Expense expense : expenses) {
            totalExpenseAmount += expense.getAmount();
            BalanceAccumulator payerBalance = balances.computeIfAbsent(
                    expense.getPayer().getId(),
                    userId -> BalanceAccumulator.from(expense.getPayer())
            );
            payerBalance.addPaidAmount(expense.getAmount());
        }

        for (ExpenseSplit split : splits) {
            BalanceAccumulator splitBalance = balances.computeIfAbsent(
                    split.getUser().getId(),
                    userId -> BalanceAccumulator.from(split.getUser())
            );
            splitBalance.addOwedAmount(split.getOwedAmount());
        }

        List<SettlementBalanceResponse> balanceResponses = balances.values().stream()
                .map(BalanceAccumulator::toResponse)
                .toList();
        List<SettlementTransferResponse> transfers = settlementCalculator.calculateTransfers(balanceResponses);
        long averagePerMemberAmount = balances.isEmpty() ? 0L : totalExpenseAmount / balances.size();

        return new SettlementSummaryResponse(
                groupId,
                totalExpenseAmount,
                averagePerMemberAmount,
                balanceResponses,
                transfers
        );
    }

    // 활성 멤버를 먼저 넣어 지출이 없는 멤버도 0원 잔액으로 표시한다.
    private Map<Long, BalanceAccumulator> createInitialBalances(Long groupId) {
        Map<Long, BalanceAccumulator> balances = new LinkedHashMap<>();
        for (GroupMember member : groupMemberRepository.findByTravelGroupIdAndLeftAtIsNull(groupId)) {
            balances.put(member.getUser().getId(), BalanceAccumulator.from(member.getUser()));
        }
        return balances;
    }

    private static class BalanceAccumulator {
        private final Long userId;
        private final String name;
        private Long paidAmount = 0L;
        private Long owedAmount = 0L;

        private BalanceAccumulator(Long userId, String name) {
            this.userId = userId;
            this.name = name;
        }

        private static BalanceAccumulator from(User user) {
            return new BalanceAccumulator(user.getId(), user.getName());
        }

        private void addPaidAmount(Long amount) {
            paidAmount += amount;
        }

        private void addOwedAmount(Long amount) {
            owedAmount += amount;
        }

        private SettlementBalanceResponse toResponse() {
            return new SettlementBalanceResponse(
                    userId,
                    name,
                    paidAmount,
                    owedAmount,
                    paidAmount - owedAmount
            );
        }
    }
}
