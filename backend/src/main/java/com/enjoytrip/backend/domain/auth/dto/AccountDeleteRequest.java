package com.enjoytrip.backend.domain.auth.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;

/**
 * FR-AUTH-06: 계정 탈퇴 요청. 비밀번호를 재입력해 본인을 확인한다.
 */
@Schema(description = "계정 탈퇴 요청")
public record AccountDeleteRequest(

        @Schema(description = "본인 확인용 현재 비밀번호", example = "Trip1234!")
        @NotBlank(message = "비밀번호를 입력해주세요.")
        String password
) {
}
