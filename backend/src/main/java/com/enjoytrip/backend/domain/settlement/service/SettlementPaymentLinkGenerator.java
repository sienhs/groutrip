package com.enjoytrip.backend.domain.settlement.service;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;

import org.springframework.stereotype.Component;

import com.enjoytrip.backend.domain.settlement.dto.SettlementPaymentLinksResponse;
import com.enjoytrip.backend.domain.settlement.entity.Settlement;

@Component
public class SettlementPaymentLinkGenerator {

    // FR-EXPENSE-05: 외부 결제를 실행하거나 검증하지 않고 명세의 URL Scheme만 조합한다.
    public SettlementPaymentLinksResponse generate(Settlement settlement) {
        String memo = settlement.getTravelGroup().getTitle() + " 정산 - " + settlement.getToUser().getName();
        String encodedMemo = encode(memo);

        return new SettlementPaymentLinksResponse(
                settlement.getId(),
                settlement.getAmount(),
                memo,
                "supertoss://send?amount=" + settlement.getAmount() + "&msg=" + encodedMemo,
                "kakaopay://send?amount=" + settlement.getAmount(),
                settlement.getToUser().getPayoutLink(),
                settlement.getToUser().getPayoutAccount()
        );
    }

    private String encode(String value) {
        return URLEncoder.encode(value, StandardCharsets.UTF_8).replace("+", "%20");
    }
}
