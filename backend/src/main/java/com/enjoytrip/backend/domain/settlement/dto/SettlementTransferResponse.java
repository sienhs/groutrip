package com.enjoytrip.backend.domain.settlement.dto;

// FR-EXPENSE-04/05: 잔액을 상쇄하기 위해 누가 누구에게 얼마를 보내면 되는지 나타낸다.
public record SettlementTransferResponse(
        Long fromUserId,
        String fromName,
        Long toUserId,
        String toName,
        Long amount
) {
}
