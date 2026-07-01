package com.enjoytrip.backend.domain.admin.dto;

import jakarta.validation.constraints.NotNull;

/** 관리자: 계정 정지/해제. */
public record AdminBanRequest(
        @NotNull
        Boolean banned
) {
}
