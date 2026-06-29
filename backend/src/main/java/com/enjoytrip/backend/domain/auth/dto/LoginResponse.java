package com.enjoytrip.backend.domain.auth.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
@Schema(description = "로그인 응답")
public class LoginResponse {

    @Schema(description = "로그인한 사용자 ID", example = "1")
    private Long userId;

    @Schema(description = "API 인증에 사용할 JWT access token", example = "eyJhbGciOiJIUzI1NiJ9...")
    private String accessToken;

    @Schema(description = "HttpOnly 쿠키로 전달되는 refresh token. 응답 본문에서는 보통 제외된다.", example = "null")
    private String refreshToken;

    @Schema(description = "로그인한 사용자 이름", example = "홍길동")
    private String name;

    @Schema(description = "로그인한 사용자 이메일", example = "test@test.com")
    private String email;

    @Schema(description = "온보딩(동의/초기설정) 완료 여부. false면 온보딩 화면으로 보낸다.", example = "true")
    private Boolean onboarded;
}
