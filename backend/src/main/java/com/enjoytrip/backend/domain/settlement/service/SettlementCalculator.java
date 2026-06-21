package com.enjoytrip.backend.domain.settlement.service;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;

import org.springframework.stereotype.Component;

import com.enjoytrip.backend.domain.settlement.dto.SettlementBalanceResponse;
import com.enjoytrip.backend.domain.settlement.dto.SettlementTransferResponse;

@Component
public class SettlementCalculator {

    /**
     * FR-EXPENSE-04: 양수 잔액은 받을 사람, 음수 잔액은 보낼 사람으로 나누고
     * 절댓값이 큰 항목끼리 매칭해 송금 횟수를 줄이는 greedy 계산을 수행한다.
     */
    public List<SettlementTransferResponse> calculateTransfers(List<SettlementBalanceResponse> balances) {
        List<SettlementParticipant> creditors = balances.stream()
                .filter(balance -> balance.balanceAmount() > 0)
                .map(SettlementParticipant::from)
                .sorted(Comparator.comparingLong(SettlementParticipant::amount).reversed())
                .toList();
        List<SettlementParticipant> debtors = balances.stream()
                .filter(balance -> balance.balanceAmount() < 0)
                .map(balance -> new SettlementParticipant(
                        balance.userId(),
                        balance.name(),
                        -balance.balanceAmount()
                ))
                .sorted(Comparator.comparingLong(SettlementParticipant::amount).reversed())
                .toList();

        List<SettlementParticipant> mutableCreditors = new ArrayList<>(creditors);
        List<SettlementParticipant> mutableDebtors = new ArrayList<>(debtors);
        List<SettlementTransferResponse> transfers = new ArrayList<>();
        int creditorIndex = 0;
        int debtorIndex = 0;

        while (creditorIndex < mutableCreditors.size() && debtorIndex < mutableDebtors.size()) {
            SettlementParticipant creditor = mutableCreditors.get(creditorIndex);
            SettlementParticipant debtor = mutableDebtors.get(debtorIndex);
            long amount = Math.min(creditor.amount(), debtor.amount());

            transfers.add(new SettlementTransferResponse(
                    debtor.userId(),
                    debtor.name(),
                    creditor.userId(),
                    creditor.name(),
                    amount
            ));

            creditor = creditor.minus(amount);
            debtor = debtor.minus(amount);
            mutableCreditors.set(creditorIndex, creditor);
            mutableDebtors.set(debtorIndex, debtor);

            if (creditor.amount() == 0) {
                creditorIndex++;
            }
            if (debtor.amount() == 0) {
                debtorIndex++;
            }
        }

        return transfers;
    }

    private record SettlementParticipant(Long userId, String name, Long amount) {
        private static SettlementParticipant from(SettlementBalanceResponse balance) {
            return new SettlementParticipant(balance.userId(), balance.name(), balance.balanceAmount());
        }

        private SettlementParticipant minus(Long value) {
            return new SettlementParticipant(userId, name, amount - value);
        }
    }
}
