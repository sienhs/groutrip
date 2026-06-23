package com.enjoytrip.backend.domain.auth.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * FR-MYPAGE: 프로필(이름) 수정 요청.
 */
@Schema(description = "프로필 수정 요청")
public record ProfileUpdateRequest(

        @Schema(description = "변경할 이름", example = "여행자")
        @NotBlank(message = "이름을 입력해주세요.")
        @Size(min = 1, max = 20, message = "이름은 1~20자여야 합니다.")
        String name
) {
}
