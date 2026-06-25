package com.enjoytrip.backend.domain.auth.dto;

import jakarta.validation.constraints.Size;

/**
 * 정산 받을 링크/계좌 변경 요청. 둘 다 선택값(빈 값이면 미설정으로 저장).
 *  - payoutLink: 토스/카카오페이 등 송금 링크(URL)
 *  - payoutAccount: 은행/계좌번호(예: "카카오뱅크 3333-01-1234567 홍길동")
 */
public record PayoutRequest(
        @Size(max = 255, message = "송금 링크는 255자 이하여야 합니다.")
        String payoutLink,
        @Size(max = 120, message = "계좌 정보는 120자 이하여야 합니다.")
        String payoutAccount
) {
}
