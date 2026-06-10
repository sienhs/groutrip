package com.enjoytrip.backend.domain.settlement.dto;

// FR-EXPENSE-04: 멤버별 낸 돈, 부담할 돈, 최종 잔액을 보여준다.
public record SettlementBalanceResponse(
        Long userId,
        String name,
        Long paidAmount,
        Long owedAmount,
        Long balanceAmount
) {
}
