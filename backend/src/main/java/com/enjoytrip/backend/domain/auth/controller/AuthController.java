package com.enjoytrip.backend.domain.auth.controller;

import java.time.Duration;
import java.util.Arrays;

import org.springframework.http.ResponseEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseCookie;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.enjoytrip.backend.domain.auth.dto.LoginRequest;
import com.enjoytrip.backend.domain.auth.dto.LoginResponse;
import com.enjoytrip.backend.domain.auth.dto.SignupRequest;
import com.enjoytrip.backend.domain.auth.service.AuthService;
import com.enjoytrip.backend.domain.auth.service.LoginAttemptService;
import com.enjoytrip.backend.global.exception.BusinessException;
import com.enjoytrip.backend.global.exception.ErrorCode;
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
	private final AuthService authService;
	private final LoginAttemptService loginAttemptService;

	@Value("${auth.refresh-cookie-secure:false}")
	private boolean refreshCookieSecure;
	
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
			HttpServletRequest httpRequest,
			HttpServletResponse response){
		String clientKey = httpRequest.getRemoteAddr();
		loginAttemptService.checkAllowed(clientKey);
		LoginResponse loginResponse;
		try {
			loginResponse = authService.login(request);
		} catch (BusinessException exception) {
			if (exception.getErrorCode() == ErrorCode.INVALID_CREDENTIALS) {
				loginAttemptService.recordFailure(clientKey);
			}
			throw exception;
		}
		loginAttemptService.recordSuccess(clientKey);
		
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
		ResponseCookie cookie = ResponseCookie.from(REFRESH_TOKEN_COOKIE, token)
				.httpOnly(true)
				.secure(refreshCookieSecure)
				.sameSite("Lax")
				.path("/api/auth")
				.maxAge(Duration.ofDays(7))
				.build();
		response.addHeader(HttpHeaders.SET_COOKIE, cookie.toString());
	}
	// Cookie에서 Refresh token 추출 헬퍼
	private String extractRefreshTokenFromCookie(HttpServletRequest request) {
		if(request.getCookies() == null) {
			throw new BusinessException(ErrorCode.INVALID_TOKEN);
		}
		return Arrays.stream(request.getCookies())
				.filter(c -> REFRESH_TOKEN_COOKIE.equals(c.getName()))
				.map(Cookie::getValue)
				.findFirst()
				.orElseThrow(() -> new BusinessException(ErrorCode.INVALID_TOKEN));
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
					FR-AUTH-04: 인증 사용자에 연결된 refreshToken을 저장소에서 삭제하고 쿠키를 제거한다.
					"""
	)
	public ResponseEntity<ApiResponse<Void>> logout(
				HttpServletResponse response,
				Authentication authentication){

		if (authentication != null && authentication.isAuthenticated()) {
			String email = authentication.getName();
			authService.logout(email);
		}

		ResponseCookie cookie = ResponseCookie.from(REFRESH_TOKEN_COOKIE, "")
				.httpOnly(true)
				.secure(refreshCookieSecure)
				.sameSite("Lax")
				.path("/api/auth")
				.maxAge(Duration.ZERO)
				.build();
		response.addHeader(HttpHeaders.SET_COOKIE, cookie.toString());

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

