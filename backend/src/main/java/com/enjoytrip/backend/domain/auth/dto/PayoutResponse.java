package com.enjoytrip.backend.domain.auth.dto;

/** 정산 받을 링크/계좌 응답(미설정이면 null). */
public record PayoutResponse(
        String payoutLink,
        String payoutAccount
) {
}
