package com.enjoytrip.backend.domain.auth.service;

import java.security.SecureRandom;
import java.time.Duration;
import java.time.Instant;
import java.util.HexFormat;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import com.enjoytrip.backend.global.exception.BusinessException;
import com.enjoytrip.backend.global.exception.ErrorCode;

/** OAuth 콜백 결과를 URL의 토큰 노출 없이 프론트엔드에 전달하는 1회용 코드 저장소다. */
@Component
public class OAuthAuthorizationCodeStore {

	private static final Duration CODE_TTL = Duration.ofSeconds(60);
	private static final int MAX_PENDING_CODES = 10_000;

	private final SecureRandom secureRandom = new SecureRandom();
	private final Map<String, PendingLogin> pendingLogins = new ConcurrentHashMap<>();

	public String issue(Long userId) {
		cleanupExpired();
		if (pendingLogins.size() >= MAX_PENDING_CODES) {
			throw new BusinessException(ErrorCode.OAUTH_LOGIN_FAILED);
		}

		byte[] randomBytes = new byte[32];
		secureRandom.nextBytes(randomBytes);
		String code = HexFormat.of().formatHex(randomBytes);
		pendingLogins.put(code, new PendingLogin(userId, Instant.now().plus(CODE_TTL)));
		return code;
	}

	public Long consume(String code) {
		PendingLogin pendingLogin = pendingLogins.remove(code);
		if (pendingLogin == null || pendingLogin.expiresAt().isBefore(Instant.now())) {
			throw new BusinessException(ErrorCode.OAUTH_CODE_INVALID);
		}
		return pendingLogin.userId();
	}

	@Scheduled(fixedDelay = 60_000)
	void cleanupExpired() {
		Instant now = Instant.now();
		pendingLogins.entrySet().removeIf(entry -> entry.getValue().expiresAt().isBefore(now));
	}

	private record PendingLogin(Long userId, Instant expiresAt) {
	}
}
