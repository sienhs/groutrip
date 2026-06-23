package com.enjoytrip.backend.domain.auth.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.verify;

import java.util.List;
import java.util.Map;
import java.util.Optional;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.oauth2.client.authentication.OAuth2AuthenticationToken;
import org.springframework.security.oauth2.core.user.DefaultOAuth2User;

import com.enjoytrip.backend.domain.auth.entity.OAuthIdentity;
import com.enjoytrip.backend.domain.auth.entity.OAuthProvider;
import com.enjoytrip.backend.domain.auth.entity.User;
import com.enjoytrip.backend.domain.auth.repository.OAuthIdentityRepository;
import com.enjoytrip.backend.domain.auth.repository.UserRepository;
import com.enjoytrip.backend.global.exception.BusinessException;
import com.enjoytrip.backend.global.exception.ErrorCode;

@ExtendWith(MockitoExtension.class)
class OAuthLoginServiceTest {

	@Mock
	private OAuthIdentityRepository oAuthIdentityRepository;
	@Mock
	private UserRepository userRepository;
	@Mock
	private PasswordEncoder passwordEncoder;

	private OAuthLoginService service;

	@BeforeEach
	void setUp() {
		service = new OAuthLoginService(oAuthIdentityRepository, userRepository, passwordEncoder);
	}

	@Test
	void createsGoogleIdentityOnlyForVerifiedEmail() {
		OAuth2AuthenticationToken token = token("google", "sub", Map.of(
				"sub", "google-123",
				"email", "Traveler@Example.com",
				"email_verified", true,
				"name", "여행 친구"
		));
		given(oAuthIdentityRepository.findByProviderAndProviderUserId(OAuthProvider.GOOGLE, "google-123"))
				.willReturn(Optional.empty());
		given(userRepository.findByEmailIgnoreCase("traveler@example.com")).willReturn(Optional.empty());
		given(passwordEncoder.encode(any())).willReturn("encoded-random-password");
		given(userRepository.save(any(User.class))).willAnswer(invocation -> invocation.getArgument(0));

		User user = service.resolveUser(token);

		assertThat(user.getEmail()).isEqualTo("traveler@example.com");
		assertThat(user.getName()).isEqualTo("여행친구");
		ArgumentCaptor<OAuthIdentity> identityCaptor = ArgumentCaptor.forClass(OAuthIdentity.class);
		verify(oAuthIdentityRepository).save(identityCaptor.capture());
		assertThat(identityCaptor.getValue().getProvider()).isEqualTo(OAuthProvider.GOOGLE);
		assertThat(identityCaptor.getValue().getProviderUserId()).isEqualTo("google-123");
	}

	@Test
	void createsKakaoIdentityFromVerifiedKakaoAccount() {
		OAuth2AuthenticationToken token = token("kakao", "id", Map.of(
				"id", 987654321L,
				"kakao_account", Map.of(
						"email", "kakao@example.com",
						"is_email_valid", true,
						"is_email_verified", true,
						"profile", Map.of("nickname", "카카오 여행자")
				)
		));
		given(oAuthIdentityRepository.findByProviderAndProviderUserId(OAuthProvider.KAKAO, "987654321"))
				.willReturn(Optional.empty());
		given(userRepository.findByEmailIgnoreCase("kakao@example.com")).willReturn(Optional.empty());
		given(passwordEncoder.encode(any())).willReturn("encoded-random-password");
		given(userRepository.save(any(User.class))).willAnswer(invocation -> invocation.getArgument(0));

		User user = service.resolveUser(token);

		assertThat(user.getName()).isEqualTo("카카오여행자");
		verify(oAuthIdentityRepository).save(any(OAuthIdentity.class));
	}

	@Test
	void rejectsUnverifiedProviderEmail() {
		OAuth2AuthenticationToken token = token("google", "sub", Map.of(
				"sub", "google-123",
				"email", "traveler@example.com",
				"email_verified", false,
				"name", "Traveler"
		));

		assertThatThrownBy(() -> service.resolveUser(token))
				.isInstanceOfSatisfying(BusinessException.class,
						exception -> assertThat(exception.getErrorCode()).isEqualTo(ErrorCode.OAUTH_LOGIN_FAILED));
	}

	private OAuth2AuthenticationToken token(String registrationId, String nameAttributeKey, Map<String, Object> attributes) {
		DefaultOAuth2User principal = new DefaultOAuth2User(List.of(), attributes, nameAttributeKey);
		return new OAuth2AuthenticationToken(principal, principal.getAuthorities(), registrationId);
	}
}
