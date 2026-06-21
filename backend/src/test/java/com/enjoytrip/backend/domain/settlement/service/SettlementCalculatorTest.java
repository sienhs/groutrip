package com.enjoytrip.backend.domain.settlement.service;

import static org.junit.jupiter.api.Assertions.assertEquals;

import java.util.List;

import org.junit.jupiter.api.Test;

import com.enjoytrip.backend.domain.settlement.dto.SettlementBalanceResponse;
import com.enjoytrip.backend.domain.settlement.dto.SettlementTransferResponse;

class SettlementCalculatorTest {

    private final SettlementCalculator calculator = new SettlementCalculator();

    @Test
    void calculateTransfersMatchesLargestCreditorAndDebtorFirst() {
        List<SettlementTransferResponse> transfers = calculator.calculateTransfers(List.of(
                new SettlementBalanceResponse(1L, "A", 80_000L, 20_000L, 60_000L),
                new SettlementBalanceResponse(2L, "B", 0L, 30_000L, -30_000L),
                new SettlementBalanceResponse(3L, "C", 0L, 30_000L, -30_000L)
        ));

        assertEquals(2, transfers.size());
        assertEquals(2L, transfers.get(0).fromUserId());
        assertEquals(1L, transfers.get(0).toUserId());
        assertEquals(30_000L, transfers.get(0).amount());
        assertEquals(3L, transfers.get(1).fromUserId());
        assertEquals(1L, transfers.get(1).toUserId());
        assertEquals(30_000L, transfers.get(1).amount());
    }

    @Test
    void calculateTransfersSplitsOneDebtorAcrossMultipleCreditors() {
        List<SettlementTransferResponse> transfers = calculator.calculateTransfers(List.of(
                new SettlementBalanceResponse(1L, "A", 50_000L, 20_000L, 30_000L),
                new SettlementBalanceResponse(2L, "B", 40_000L, 20_000L, 20_000L),
                new SettlementBalanceResponse(3L, "C", 0L, 50_000L, -50_000L)
        ));

        assertEquals(2, transfers.size());
        assertEquals(3L, transfers.get(0).fromUserId());
        assertEquals(1L, transfers.get(0).toUserId());
        assertEquals(30_000L, transfers.get(0).amount());
        assertEquals(3L, transfers.get(1).fromUserId());
        assertEquals(2L, transfers.get(1).toUserId());
        assertEquals(20_000L, transfers.get(1).amount());
    }
}
