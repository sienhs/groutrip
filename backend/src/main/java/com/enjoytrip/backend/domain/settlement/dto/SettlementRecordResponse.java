package com.enjoytrip.backend.domain.settlement.dto;

import java.time.LocalDateTime;

import com.enjoytrip.backend.domain.settlement.entity.Settlement;
import com.enjoytrip.backend.domain.settlement.entity.SettlementStatus;

// FR-EXPENSE-06: 저장된 송금 건의 당사자, 금액, 확인 상태를 내려준다.
public record SettlementRecordResponse(
        Long id,
        Long fromUserId,
        String fromName,
        Long toUserId,
        String toName,
        Long amount,
        SettlementStatus status,
        LocalDateTime senderConfirmedAt,
        LocalDateTime receiverConfirmedAt
) {
    public static SettlementRecordResponse from(Settlement settlement) {
        return new SettlementRecordResponse(
                settlement.getId(),
                settlement.getFromUser().getId(),
                settlement.getFromUser().getName(),
                settlement.getToUser().getId(),
                settlement.getToUser().getName(),
                settlement.getAmount(),
                settlement.getStatus(),
                settlement.getSenderConfirmedAt(),
                settlement.getReceiverConfirmedAt()
        );
    }
}
