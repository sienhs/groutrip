package com.enjoytrip.backend.global.security;

import java.io.IOException;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.web.authentication.AuthenticationFailureHandler;
import org.springframework.stereotype.Component;
import org.springframework.web.util.UriComponentsBuilder;

import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpSession;
import lombok.extern.slf4j.Slf4j;

@Component
@Slf4j
public class OAuth2LoginFailureHandler implements AuthenticationFailureHandler {

	@Value("${app.frontend-base-url:http://localhost:5173}")
	private String frontendBaseUrl;

	@Override
	public void onAuthenticationFailure(
			HttpServletRequest request,
			HttpServletResponse response,
			AuthenticationException exception
	) throws IOException, ServletException {
		log.warn("OAuth provider authentication failed: {}", exception.getClass().getSimpleName(), exception);
		HttpSession session = request.getSession(false);
		if (session != null) {
			session.invalidate();
		}
		response.sendRedirect(UriComponentsBuilder.fromUriString(frontendBaseUrl)
				.path("/oauth/callback")
				.queryParam("error", "oauth_failed")
				.build()
				.encode()
				.toUriString());
	}
}
