package com.enjoytrip.backend.domain.auth.service;

import java.security.SecureRandom;
import java.util.Base64;
import java.util.Map;

import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.oauth2.client.authentication.OAuth2AuthenticationToken;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.enjoytrip.backend.domain.auth.entity.OAuthIdentity;
import com.enjoytrip.backend.domain.auth.entity.OAuthProvider;
import com.enjoytrip.backend.domain.auth.entity.User;
import com.enjoytrip.backend.domain.auth.repository.OAuthIdentityRepository;
import com.enjoytrip.backend.domain.auth.repository.UserRepository;
import com.enjoytrip.backend.global.exception.BusinessException;
import com.enjoytrip.backend.global.exception.ErrorCode;

import lombok.RequiredArgsConstructor;

/** Google/Kakao가 검증한 사용자 정보만 내부 계정과 연결한다. */
@Service
@RequiredArgsConstructor
public class OAuthLoginService {

	private static final SecureRandom SECURE_RANDOM = new SecureRandom();

	private final OAuthIdentityRepository oAuthIdentityRepository;
	private final UserRepository userRepository;
	private final PasswordEncoder passwordEncoder;

	@Transactional
	public User resolveUser(OAuth2AuthenticationToken authentication) {
		OAuthProvider provider = OAuthProvider.fromRegistrationId(authentication.getAuthorizedClientRegistrationId());
		OAuthUserProfile profile = extractProfile(provider, authentication.getPrincipal());

		return oAuthIdentityRepository.findByProviderAndProviderUserId(provider, profile.providerUserId())
				.map(OAuthIdentity::getUser)
				.map(this::requireActive)
				.orElseGet(() -> connectNewIdentity(provider, profile));
	}

	private User connectNewIdentity(OAuthProvider provider, OAuthUserProfile profile) {
		User user = userRepository.findByEmailIgnoreCase(profile.email())
				.map(this::requireActive)
				.orElseGet(() -> userRepository.save(User.builder()
						.email(profile.email())
						.name(normalizeName(profile.name()))
						// 소셜 전용 계정은 사용자가 알 수 없는 무작위 비밀번호를 저장해 비밀번호 로그인을 차단한다.
						.password(passwordEncoder.encode(randomPassword()))
						.build()));

		oAuthIdentityRepository.save(OAuthIdentity.builder()
				.user(user)
				.provider(provider)
				.providerUserId(profile.providerUserId())
				.build());
		return user;
	}

	private OAuthUserProfile extractProfile(OAuthProvider provider, OAuth2User principal) {
		Map<String, Object> attributes = principal.getAttributes();
		return switch (provider) {
			case GOOGLE -> googleProfile(attributes);
			case KAKAO -> kakaoProfile(attributes);
		};
	}

	private OAuthUserProfile googleProfile(Map<String, Object> attributes) {
		if (!isTrue(attributes.get("email_verified"))) {
			throw new BusinessException(ErrorCode.OAUTH_LOGIN_FAILED);
		}
		return profile(attributes.get("sub"), attributes.get("email"), attributes.get("name"));
	}

	private OAuthUserProfile kakaoProfile(Map<String, Object> attributes) {
		String idValue = requiredString(attributes.get("id"));
		Map<String, Object> account = optionalMap(attributes.get("kakao_account"));
		Map<String, Object> profile = optionalMap(account.get("profile"));
		Map<String, Object> properties = optionalMap(attributes.get("properties"));
		Object nickname = firstPresent(profile.get("nickname"), properties.get("nickname"), "여행자");
		return profile(idValue, kakaoEmail(account, idValue), nickname);
	}

	private String kakaoEmail(Map<String, Object> account, String providerUserId) {
		Object email = account.get("email");
		if (email != null
				&& isTrue(account.get("is_email_valid"))
				&& isTrue(account.get("is_email_verified"))) {
			String emailValue = email.toString().trim().toLowerCase();
			if (emailValue.matches("^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$")) {
				return emailValue;
			}
		}
		// Kakao 앱에서 account_email 동의항목을 요청할 수 없는 경우에도 소셜 계정 식별자로 내부 계정을 만든다.
		return "kakao-" + providerUserId + "@oauth.local";
	}

	private OAuthUserProfile profile(Object providerUserId, Object email, Object name) {
		String idValue = requiredString(providerUserId);
		String emailValue = requiredString(email).trim().toLowerCase();
		if (!emailValue.matches("^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$")) {
			throw new BusinessException(ErrorCode.OAUTH_LOGIN_FAILED);
		}
		return new OAuthUserProfile(idValue, emailValue, name == null ? "여행자" : name.toString());
	}

	private User requireActive(User user) {
		if (user.isWithdrawn()) {
			throw new BusinessException(ErrorCode.OAUTH_LOGIN_FAILED);
		}
		return user;
	}

	private String normalizeName(String rawName) {
		String normalized = rawName.replaceAll("[^\\p{L}\\p{N}]", "");
		if (normalized.codePointCount(0, normalized.length()) < 2) {
			return "여행자";
		}
		int endIndex = normalized.offsetByCodePoints(0, Math.min(20, normalized.codePointCount(0, normalized.length())));
		return normalized.substring(0, endIndex);
	}

	private String randomPassword() {
		byte[] bytes = new byte[32];
		SECURE_RANDOM.nextBytes(bytes);
		return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
	}

	private boolean isTrue(Object value) {
		return Boolean.TRUE.equals(value) || "true".equalsIgnoreCase(String.valueOf(value));
	}

	private String requiredString(Object value) {
		if (value == null || value.toString().isBlank()) {
			throw new BusinessException(ErrorCode.OAUTH_LOGIN_FAILED);
		}
		return value.toString();
	}

	@SuppressWarnings("unchecked")
	private Map<String, Object> asMap(Object value) {
		if (!(value instanceof Map<?, ?> map)) {
			throw new BusinessException(ErrorCode.OAUTH_LOGIN_FAILED);
		}
		return (Map<String, Object>) map;
	}

	@SuppressWarnings("unchecked")
	private Map<String, Object> optionalMap(Object value) {
		if (value instanceof Map<?, ?> map) {
			return (Map<String, Object>) map;
		}
		return Map.of();
	}

	private Object firstPresent(Object... values) {
		for (Object value : values) {
			if (value != null && !value.toString().isBlank()) {
				return value;
			}
		}
		return null;
	}

	private record OAuthUserProfile(String providerUserId, String email, String name) {
	}
}
