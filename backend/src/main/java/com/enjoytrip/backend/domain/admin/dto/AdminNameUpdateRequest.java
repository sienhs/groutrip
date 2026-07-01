package com.enjoytrip.backend.domain.admin.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/** 관리자: 임의 사용자의 표시 이름(닉네임) 강제 변경. */
public record AdminNameUpdateRequest(
        @NotBlank(message = "이름을 입력해주세요.")
        @Size(min = 1, max = 20, message = "이름은 1~20자여야 합니다.")
        String name
) {
}
