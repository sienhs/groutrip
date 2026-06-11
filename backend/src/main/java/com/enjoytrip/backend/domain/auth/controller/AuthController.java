package com.enjoytrip.backend.domain.auth.controller;

import com.enjoytrip.backend.domain.auth.repository.RefreshTokenRepository;

import java.util.Arrays;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.enjoytrip.backend.domain.auth.dto.LoginRequest;
import com.enjoytrip.backend.domain.auth.dto.LoginResponse;
import com.enjoytrip.backend.domain.auth.dto.SignupRequest;
import com.enjoytrip.backend.domain.auth.service.AuthService;
import com.enjoytrip.backend.global.response.ApiResponse;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/auth") // 엔드 포인트
@RequiredArgsConstructor
@Tag(name = "Auth", description = "회원가입, 로그인, 토큰 재발급, 로그아웃 API")
public class AuthController {
	private final RefreshTokenRepository refreshTokenRepository;
	private final AuthService authService;
	
	// 쿠키 이름 상수
	private static final String REFRESH_TOKEN_COOKIE = "refresh_token";
	
	@PostMapping("/login")
	@Operation(
			summary = "로그인",
			description = """
					FR-AUTH-02: 이메일과 비밀번호로 로그인한다.
					로그인에 성공하면 accessToken은 응답 본문으로 반환하고, refreshToken은 HttpOnly 쿠키에 저장한다.
					보안을 위해 응답 본문에는 refreshToken을 포함하지 않는다.
					"""
	)
	public ResponseEntity<ApiResponse<LoginResponse>> login(
			// 요청 바디의 json을 loginRequest 객체로 반환함
			// 그다음 @Valid가 loginRequest의 @Email, @NotBlank 검증을 실행함
			// 실패하면 GlobalExceptionHandler가 잡아서 400 반환
			@RequestBody @Valid LoginRequest request,
			HttpServletResponse response){
		LoginResponse loginResponse = authService.login(request); // 쿠키를 위해 response를 인자로 받아서 loginResponse로 이름 변경
		
		// refreshtoken을 httpOnly cookie에 저장
		// js 접근불가 -> XSS 공격으로 탈취 불가
		setRefreshTokenCooke(response, loginResponse.getRefreshToken());
		
		LoginResponse safeResponse = LoginResponse.builder()
				.accessToken(loginResponse.getAccessToken())
				.name(loginResponse.getName())
				.email(loginResponse.getEmail())
				.build();
		
		return ResponseEntity.ok(ApiResponse.success("로그인 성공", safeResponse));
	}
	
	// HttpOnly 쿠키 세팅 헬퍼
	private void setRefreshTokenCooke(HttpServletResponse response, String token) {
		Cookie cookie = new Cookie(REFRESH_TOKEN_COOKIE, token);
		cookie.setHttpOnly(true); // js 접근 차단
		cookie.setSecure(false); // TODO: 운영환경에서는 true로 변경해야함 - https 필수
		cookie.setPath("/"); // 모든 경로 전송
		cookie.setMaxAge(60 * 60 * 24 * 7); // 7일 단위
		response.addCookie(cookie); 
	}
	// Cookie에서 Refresh token 추출 헬퍼
	private String extractRefreshTokenFromCookie(HttpServletRequest request) {
		if(request.getCookies() == null) {
			throw new IllegalArgumentException("쿠키가 없습니다.");
		}
		return Arrays.stream(request.getCookies())
				.filter(c -> REFRESH_TOKEN_COOKIE.equals(c.getName()))
				.map(Cookie::getValue)
				.findFirst()
				.orElseThrow(() -> new IllegalArgumentException("Refresh Token 쿠키가 없습니다."));
	}
	@PostMapping("/reissue")
	@Operation(
			summary = "Access Token 재발급",
			description = """
					FR-AUTH-03: HttpOnly 쿠키의 refresh_token을 검증해서 새 accessToken을 발급한다.
					프론트엔드는 accessToken 만료로 401을 받은 경우 이 API를 호출한 뒤 원래 요청을 재시도한다.
					"""
	)
	public ResponseEntity<ApiResponse<String>> reissue(HttpServletRequest request){
		// 쿠키에서 refresh token을 꺼냄
		String refreshToken = extractRefreshTokenFromCookie(request);
		String newAccessToken = authService.reissue(refreshToken);
		return ResponseEntity.ok(ApiResponse.success("토큰 재발급 성공", newAccessToken));
	}
	
	@PostMapping("/logout")
	@Operation(
			summary = "로그아웃",
			description = """
					FR-AUTH-04: refresh_token 쿠키를 제거해서 현재 브라우저 세션을 로그아웃 처리한다.
					향후 refreshToken 저장소 정리와 SecurityContext 기반 사용자 식별 로직을 보강할 예정이다.
					"""
	)
	public ResponseEntity<ApiResponse<Void>> logout(
				HttpServletRequest request,
				HttpServletResponse response){
		String refreshToken = extractRefreshTokenFromCookie(request);
		
		if(refreshToken != null && !refreshToken.isBlank()) {
			// JWT 이메일 꺼내서 DB 토큰 삭제
			// JwtUtil 직접 쓰지 않고 Service에서 처리하도록 email 추출은 생략
            // TODO:실제로는 SecurityContext에서 꺼내는 게 맞음 -> 추후 개선
		}
		
		Cookie cookie = new Cookie(REFRESH_TOKEN_COOKIE, null);
		cookie.setMaxAge(0);
		cookie.setPath("/");
		response.addCookie(cookie);
		
		return ResponseEntity.ok(ApiResponse.success("로그아웃 성공"));	
	}
	
	@PostMapping("/signup")
	@Operation(
			summary = "회원가입",
			description = """
					FR-AUTH-01: 이메일, 비밀번호, 이름으로 새 사용자 계정을 생성한다.
					비밀번호는 영문, 숫자, 특수문자를 각각 1개 이상 포함한 8자 이상이어야 하며 서버에서 BCrypt로 해시한다.
					회원가입 성공 후 자동 로그인은 하지 않는다.
					"""
	)
	public ResponseEntity<ApiResponse<Void>> signup(
			@RequestBody @Valid SignupRequest request
			){
		authService.signup(request);
		return ResponseEntity.ok(ApiResponse.success("회원가입 성공"));
	}
}

