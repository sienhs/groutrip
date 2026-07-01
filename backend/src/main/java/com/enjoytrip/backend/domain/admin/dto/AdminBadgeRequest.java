package com.enjoytrip.backend.domain.admin.dto;

import jakarta.validation.constraints.Size;

/** 관리자: 장난 배지/칭호 설정(빈 값이면 제거). */
public record AdminBadgeRequest(
        @Size(max = 30, message = "배지는 30자 이내여야 합니다.")
        String badge
) {
}
