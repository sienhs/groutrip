package com.enjoytrip.backend.domain.auth.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

/**
 * FR-AUTH-05: 비밀번호 변경 요청. 새 비밀번호는 회원가입과 동일한 규칙(영문·숫자·특수문자 1개 이상, 8자 이상)을 적용한다.
 */
@Schema(description = "비밀번호 변경 요청")
public record PasswordChangeRequest(

        @Schema(description = "현재 비밀번호", example = "Trip1234!")
        @NotBlank(message = "현재 비밀번호를 입력해주세요.")
        String currentPassword,

        @Schema(description = "새 비밀번호. 영문, 숫자, 특수문자를 각각 1개 이상 포함한 8자 이상.", example = "NewTrip1234!")
        @NotBlank(message = "새 비밀번호를 입력해주세요.")
        @Pattern(
                regexp = "^(?=.*[a-zA-Z])(?=.*[0-9])(?=.*[!@#$%^&*()_+\\-=\\[\\]{};':\"\\\\|,.<>\\/?]).{8,}$",
                message = "비밀번호는 영문, 숫자, 특수문자를 각각 1개 이상 포함해야 합니다."
        )
        String newPassword
) {
}
