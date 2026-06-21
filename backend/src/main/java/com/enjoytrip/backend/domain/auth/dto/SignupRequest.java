package com.enjoytrip.backend.domain.auth.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.Getter;

@Getter
@Schema(description = "회원가입 요청")
public class SignupRequest {
	
	@Schema(description = "가입할 이메일. 시스템 전체에서 고유해야 한다.", example = "newuser@test.com")
	@Email(message = "이메일 형식이 올바르지 않습니다.")
	@NotBlank(message = "이메일을 입력해주세요.")
	private String email;
	
	@Schema(description = "비밀번호. 영문, 숫자, 특수문자를 각각 1개 이상 포함한 8자 이상.", example = "Trip1234!")
	@NotBlank(message = "비밀번호를 입력해주세요.")
	@Pattern(
			regexp = "^(?=.*[a-zA-Z])(?=.*[0-9])(?=.*[!@#$%^&*()_+\\-=\\[\\]{};':\"\\\\|,.<>\\/?]).{8,}$",
			message = "비밀번호는 영문, 숫자, 특수문자를 각각 1개 이상 포함해야 합니다."
			)
	private String password;
	
	@Schema(description = "사용자 이름. 화면에 표시되는 이름이다.", example = "홍길동")
	@NotBlank(message = "이름을 입력해주세요")
	@Pattern(
			regexp = "^[가-힣a-zA-Z0-9]{2,20}$",
			message = "이름은 2~20자의 한글, 영문, 숫자만 가능합니다."
			)
	private String name;
}
