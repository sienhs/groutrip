package com.enjoytrip.backend.domain.auth.service;

import java.time.LocalDateTime;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.HexFormat;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.enjoytrip.backend.domain.auth.dto.LoginResponse;
import com.enjoytrip.backend.domain.auth.entity.RefreshToken;
import com.enjoytrip.backend.domain.auth.entity.User;
import com.enjoytrip.backend.domain.auth.repository.RefreshTokenRepository;
import com.enjoytrip.backend.domain.auth.repository.UserRepository;
import com.enjoytrip.backend.global.exception.BusinessException;
import com.enjoytrip.backend.global.exception.ErrorCode;
import com.enjoytrip.backend.global.security.JwtUtil;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Slf4j
@Service
@RequiredArgsConstructor
public class AuthService {
	// 인증은 SNS(OAuth) 전용이다. 이메일/비밀번호 로그인·회원가입은 제공하지 않는다.
	private final UserRepository userRepository;
	private final RefreshTokenRepository refreshTokenRepository;
	private final JwtUtil jwtUtil;

	@Transactional
	public LoginResponse loginWithOAuth(Long userId) {
		User user = userRepository.findById(userId)
				.filter(candidate -> !candidate.isWithdrawn())
				.orElseThrow(() -> new BusinessException(ErrorCode.OAUTH_LOGIN_FAILED));
		return issueTokens(user);
	}

	private LoginResponse issueTokens(User user) {
		String accessToken = jwtUtil.generateAccessToken(user.getEmail());
		String refreshToken = jwtUtil.generateRefreshToken(user.getEmail());
		String refreshTokenHash = hashToken(refreshToken);

		refreshTokenRepository.findByEmail(user.getEmail())
				.ifPresentOrElse(
						token -> token.updateToken(refreshTokenHash, LocalDateTime.now().plusDays(7)),
						() -> refreshTokenRepository.save(RefreshToken.builder()
								.email(user.getEmail())
								.token(refreshTokenHash)
								.expiresAt(LocalDateTime.now().plusDays(7))
								.build()));

		log.info("로그인 성공: userId={}", user.getId());
		return LoginResponse.builder()
				.userId(user.getId())
				.accessToken(accessToken)
				.name(user.getName())
				.email(user.getEmail())
				.refreshToken(refreshToken)
				.build();
	}
	
	@Transactional
	public String reissue(String refreshToken) {
		// 토큰 유효성 검증
		if(!jwtUtil.isTokenValid(refreshToken)) {
			throw new BusinessException(ErrorCode.INVALID_TOKEN);
		}
		
		// DB에서 토큰 조회 - 탈취됐는지
		RefreshToken saved = refreshTokenRepository.findByToken(hashToken(refreshToken))
				.orElseThrow(() -> new BusinessException(ErrorCode.INVALID_TOKEN));
		
		// 만료 시간 확인
		if(saved.getExpiresAt().isBefore(LocalDateTime.now())) {
			throw new BusinessException(ErrorCode.EXPIRED_TOKEN);
		}
		
		return jwtUtil.generateAccessToken(saved.getEmail());
	}

	private String hashToken(String token) {
		try {
			MessageDigest digest = MessageDigest.getInstance("SHA-256");
			return HexFormat.of().formatHex(digest.digest(token.getBytes(StandardCharsets.UTF_8)));
		} catch (NoSuchAlgorithmException exception) {
			throw new IllegalStateException("SHA-256 is not available.", exception);
		}
	}
	
	@Transactional
	public void logout(String email) {
		refreshTokenRepository.deleteByEmail(email);
		log.info("로그아웃: {}", email);
	}

}
