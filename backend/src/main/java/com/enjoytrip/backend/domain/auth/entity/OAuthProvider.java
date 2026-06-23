package com.enjoytrip.backend.domain.auth.entity;

import java.util.Locale;

import com.enjoytrip.backend.global.exception.BusinessException;
import com.enjoytrip.backend.global.exception.ErrorCode;

public enum OAuthProvider {
	GOOGLE,
	KAKAO;

	public static OAuthProvider fromRegistrationId(String registrationId) {
		try {
			return valueOf(registrationId.toUpperCase(Locale.ROOT));
		} catch (IllegalArgumentException | NullPointerException exception) {
			throw new BusinessException(ErrorCode.OAUTH_LOGIN_FAILED);
		}
	}
}
