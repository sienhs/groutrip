package com.enjoytrip.backend.domain.auth.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@Schema(description = "로그인 요청")
public class LoginRequest {
	@Schema(description = "로그인 이메일", example = "test@test.com")
	@Email(message = "이메일 형식이 올바르지 않습니다.")
	@NotBlank(message = "이메일을 입력해주세요.")
	private String email;
	
	@Schema(description = "로그인 비밀번호", example = "test1234!")
	@NotBlank(message = "비밀번호를 입력해주세요.")
	private String password;
	
}
