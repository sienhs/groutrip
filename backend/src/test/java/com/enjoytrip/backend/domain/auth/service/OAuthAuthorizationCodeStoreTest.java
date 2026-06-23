package com.enjoytrip.backend.domain.auth.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import org.junit.jupiter.api.Test;

import com.enjoytrip.backend.global.exception.BusinessException;
import com.enjoytrip.backend.global.exception.ErrorCode;

class OAuthAuthorizationCodeStoreTest {

	private final OAuthAuthorizationCodeStore store = new OAuthAuthorizationCodeStore();

	@Test
	void issuedCodeCanBeConsumedOnlyOnce() {
		String code = store.issue(42L);

		assertThat(code).matches("^[a-f0-9]{64}$");
		assertThat(store.consume(code)).isEqualTo(42L);
		assertThatThrownBy(() -> store.consume(code))
				.isInstanceOfSatisfying(BusinessException.class,
						exception -> assertThat(exception.getErrorCode()).isEqualTo(ErrorCode.OAUTH_CODE_INVALID));
	}
}
