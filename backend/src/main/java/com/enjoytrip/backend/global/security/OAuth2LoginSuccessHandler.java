package com.enjoytrip.backend.global.security;

import java.io.IOException;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.client.authentication.OAuth2AuthenticationToken;
import org.springframework.security.web.authentication.AuthenticationSuccessHandler;
import org.springframework.stereotype.Component;
import org.springframework.web.util.UriComponentsBuilder;

import com.enjoytrip.backend.domain.auth.entity.User;
import com.enjoytrip.backend.domain.auth.service.OAuthAuthorizationCodeStore;
import com.enjoytrip.backend.domain.auth.service.OAuthLoginService;

import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpSession;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

/** 공급자 토큰 대신 짧게 유효한 1회용 코드만 프론트엔드 URL로 전달한다. */
@Component
@RequiredArgsConstructor
@Slf4j
public class OAuth2LoginSuccessHandler implements AuthenticationSuccessHandler {

	private final OAuthLoginService oAuthLoginService;
	private final OAuthAuthorizationCodeStore authorizationCodeStore;

	@Value("${app.frontend-base-url:http://localhost:5173}")
	private String frontendBaseUrl;

	@Override
	public void onAuthenticationSuccess(
			HttpServletRequest request,
			HttpServletResponse response,
			Authentication authentication
	) throws IOException, ServletException {
		try {
			if (!(authentication instanceof OAuth2AuthenticationToken oAuthToken)) {
				redirectFailure(request, response);
				return;
			}
			User user = oAuthLoginService.resolveUser(oAuthToken);
			String code = authorizationCodeStore.issue(user.getId());
			invalidateSession(request);
			response.sendRedirect(UriComponentsBuilder.fromUriString(frontendBaseUrl)
					.path("/oauth/callback")
					.queryParam("code", code)
					.build()
					.encode()
					.toUriString());
		} catch (RuntimeException exception) {
			log.warn("OAuth login success handling failed: {}", exception.getClass().getSimpleName(), exception);
			redirectFailure(request, response);
		}
	}

	private void redirectFailure(HttpServletRequest request, HttpServletResponse response) throws IOException {
		invalidateSession(request);
		response.sendRedirect(UriComponentsBuilder.fromUriString(frontendBaseUrl)
				.path("/oauth/callback")
				.queryParam("error", "oauth_failed")
				.build()
				.encode()
				.toUriString());
	}

	private void invalidateSession(HttpServletRequest request) {
		HttpSession session = request.getSession(false);
		if (session != null) {
			session.invalidate();
		}
	}
}
