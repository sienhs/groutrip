package com.enjoytrip.backend.domain.settlement.entity;

// FR-EXPENSE-06: 송금자의 완료 확인과 수취인의 수령 확인 상태를 구분한다.
public enum SettlementStatus {
    PENDING,
    SENT,
    COMPLETED
}
