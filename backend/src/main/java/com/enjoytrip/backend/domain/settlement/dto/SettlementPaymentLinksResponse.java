package com.enjoytrip.backend.domain.settlement.dto;

// FR-EXPENSE-05: 모바일 송금 앱 실행용 URL을 제공한다. PC QR은 프론트가 각 URL을 그대로 인코딩한다.
public record SettlementPaymentLinksResponse(
        Long settlementId,
        Long amount,
        String memo,
        String tossDeepLink,
        String kakaoPayDeepLink
) {
}
