package com.enjoytrip.backend.domain.settlement.dto;

import java.util.List;

// FR-EXPENSE-04: 그룹 정산 화면에서 필요한 총액, 평균, 멤버별 잔액, 최소 송금 목록을 묶어 내려준다.
public record SettlementSummaryResponse(
        Long groupId,
        Long totalExpenseAmount,
        Long averagePerMemberAmount,
        List<SettlementBalanceResponse> balances,
        List<SettlementTransferResponse> transfers
) {
}
