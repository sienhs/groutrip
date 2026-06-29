package com.enjoytrip.backend.global.config;

import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.oauth2.client.registration.ClientRegistrationRepository;
import org.springframework.security.oauth2.client.web.DefaultOAuth2AuthorizationRequestResolver;
import org.springframework.security.oauth2.client.web.OAuth2AuthorizationRequestResolver;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.oauth2.core.endpoint.OAuth2AuthorizationRequest;
import org.springframework.security.oauth2.core.endpoint.PkceParameterNames;
import org.springframework.core.annotation.Order;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.util.UriComponentsBuilder;

import com.enjoytrip.backend.global.security.JwtFilter;
import com.enjoytrip.backend.global.security.OAuth2LoginFailureHandler;
import com.enjoytrip.backend.global.security.OAuth2LoginSuccessHandler;
import com.enjoytrip.backend.global.security.RestAccessDeniedHandler;
import com.enjoytrip.backend.global.security.RestAuthenticationEntryPoint;

import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;

@Configuration
@EnableWebSecurity
// @RequiredArgsConstructor
public class SecurityConfig {
	/*
	 * 
	 * Spring Boot 4.0에서 파라미터 이름 정보를 컴파일 시점에 보존하는 방식이 변경됨.
	 * 그래서 Spring이 생성자를 보고 주입할 bean을 찾을때 파라미터 이름을 보고 같은 이름의 bean을 찾음
	 * 이전엔 컴파일러가 파라미터 이름을 바이트코드에 자동으로 보존해줬는데 spring 6.1부터 컴파일러 옵션(-parameters)이 없으면
	 * 파라미터 이름 정보가 날아감
	 * 
	 * 일단은 build.gradle 에 옵션 작성하는걸로 수정하겠음.
	 * 
	 * */
	
	// JwtFilter를 주입 자동 생성자 생성
	private final JwtFilter jwtFilter;
	private final CorsConfigurationSource corsConfigurationSource;
	private final RestAuthenticationEntryPoint authenticationEntryPoint;
	private final RestAccessDeniedHandler accessDeniedHandler;
	private final OAuth2LoginSuccessHandler oAuth2LoginSuccessHandler;
	private final OAuth2LoginFailureHandler oAuth2LoginFailureHandler;
	private final ClientRegistrationRepository clientRegistrationRepository;
	

	public SecurityConfig(
			JwtFilter jwtFilter,
			// Bean 명시적 지정
			@Qualifier("corsConfigurationSource") CorsConfigurationSource corsConfigurationSource,
			RestAuthenticationEntryPoint authenticationEntryPoint,
			RestAccessDeniedHandler accessDeniedHandler,
			OAuth2LoginSuccessHandler oAuth2LoginSuccessHandler,
			OAuth2LoginFailureHandler oAuth2LoginFailureHandler,
			ClientRegistrationRepository clientRegistrationRepository
			) {
		this.jwtFilter = jwtFilter;
		this.corsConfigurationSource = corsConfigurationSource;
		this.authenticationEntryPoint = authenticationEntryPoint;
		this.accessDeniedHandler = accessDeniedHandler;
		this.oAuth2LoginSuccessHandler = oAuth2LoginSuccessHandler;
		this.oAuth2LoginFailureHandler = oAuth2LoginFailureHandler;
		this.clientRegistrationRepository = clientRegistrationRepository;
	}
	
	
	// WebSocket 핸드셰이크(/ws)는 HTTP 레벨 인증 없이 허용하고, 인증은 STOMP CONNECT 프레임에서 처리한다.
	// Spring Security 7에서 일반 filterChain의 permitAll()이 WebSocket 경로를 올바르게 매칭하지 못하는 경우를 방지하기 위해
	// 별도 체인을 최우선 순위로 등록한다.
	@Bean
	@Order(0)
	public SecurityFilterChain websocketChain(HttpSecurity http) throws Exception {
		return http
			.securityMatcher("/ws", "/ws/**")
			.authorizeHttpRequests(auth -> auth.anyRequest().permitAll())
			.csrf(AbstractHttpConfigurer::disable)
			.cors(cors -> cors.configurationSource(corsConfigurationSource))
			.build();
	}

	@Bean
	public SecurityFilterChain filterChain(HttpSecurity http) throws Exception{
		http
		// CorsCofing 적용
		.cors(cors -> cors.configurationSource(corsConfigurationSource))
		// CSRF 비활성화
		// Access Token은 Authorization 헤더로만 받고 Refresh Cookie는 SameSite=Lax로 제한한다.
		.csrf(AbstractHttpConfigurer::disable)
		// 기본 폼 로그인 방식 비활성화
		// rest api + jwt 쓸때는 폼 로그인 안쓴대
		.formLogin(AbstractHttpConfigurer::disable)
		// HTTP Basic 인증 비활성화
		// basic인증은 author: Basic base64(id:pw) 헤더방식인데 jwt쓸거라 필요 없음
		.httpBasic(AbstractHttpConfigurer::disable)
		
		// 세션 비활성화
		// jwt는 stateless라서 세션을 만들지도, 사용하지도 않는다는 선언
		// 일반 API는 JWT를 사용하며, OAuth state 검증 과정에서만 짧은 HTTP 세션을 생성한다.
		.sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.IF_REQUIRED))
		
		// 요청별 접근 권한 설정
		.authorizeHttpRequests(auth -> auth
				// 토큰 재발급/소셜 로그인 코드 교환과 OAuth 콜백은 토큰 없이 접근 가능해야 한다.
				.requestMatchers(
						"/api/auth/reissue", "/api/auth/oauth/exchange",
						"/oauth2/**", "/login/oauth2/**")
				.permitAll()
				// Swagger UI와 OpenAPI 명세는 개발 중 API 확인을 위해 인증 없이 접근을 허용한다.
				.requestMatchers("/swagger-ui.html", "/swagger-ui/**", "/v3/api-docs/**", "/v3/api-docs.yaml").permitAll()
				// 장소 썸네일 프록시는 <img src>로 직접 로드돼 인증 헤더를 실을 수 없으므로 공개한다.
				// (Google 키는 BE에만 있고 민감 정보가 없는 이미지 스트림이다.)
				.requestMatchers(HttpMethod.GET, "/api/places/photo").permitAll()
				// 프로필 사진도 <img src>로 여러 화면에서 직접 로드되므로 조회는 공개한다(업로드는 인증 필요).
				.requestMatchers(HttpMethod.GET, "/api/users/*/avatar").permitAll()
				// 그룹 커버 이미지도 홈/목록/상세에서 <img src>로 직접 로드되므로 조회는 공개한다.
				.requestMatchers(HttpMethod.GET, "/api/groups/*/cover").permitAll()
				// WebSocket 핸드셰이크는 HTTP 레벨 인증을 건너뛰고 STOMP CONNECT 프레임에서 JWT로 인증한다.
				// (HTTP 레벨 /ws 허용은 websocketChain()에서 처리 — 여기서도 명시적으로 선언)
				.requestMatchers("/ws", "/ws/**").permitAll()
				// 나머지 요청은 인증이 필요하게
				.anyRequest().authenticated())
		.exceptionHandling(exceptions -> exceptions
				.authenticationEntryPoint(authenticationEntryPoint)
				.accessDeniedHandler(accessDeniedHandler))
		.oauth2Login(oauth -> oauth
				.authorizationEndpoint(authorization -> authorization
						.authorizationRequestResolver(oAuth2AuthorizationRequestResolver()))
				.successHandler(oAuth2LoginSuccessHandler)
				.failureHandler(oAuth2LoginFailureHandler))
		.addFilterBefore(jwtFilter, UsernamePasswordAuthenticationFilter.class);
		
		return http.build();
	}

	private OAuth2AuthorizationRequestResolver oAuth2AuthorizationRequestResolver() {
		DefaultOAuth2AuthorizationRequestResolver resolver = new DefaultOAuth2AuthorizationRequestResolver(
				clientRegistrationRepository,
				"/oauth2/authorization"
		);
		resolver.setAuthorizationRequestCustomizer(builder -> {
			// Kakao 인증 요청에서 PKCE 파라미터가 서비스 설정 오류(KOE205)를 유발할 수 있어 제거한다.
			// 토큰 교환 단계에서는 백엔드가 client secret으로 confidential client 인증을 수행한다.
			builder.attributes(attributes -> attributes.remove(PkceParameterNames.CODE_VERIFIER));
			builder.additionalParameters(parameters -> {
				parameters.remove(PkceParameterNames.CODE_CHALLENGE);
				parameters.remove(PkceParameterNames.CODE_CHALLENGE_METHOD);
			});
		});
		return new OAuth2AuthorizationRequestResolver() {
			@Override
			public OAuth2AuthorizationRequest resolve(HttpServletRequest request) {
				return customizeKakaoRequest(resolver.resolve(request));
			}

			@Override
			public OAuth2AuthorizationRequest resolve(HttpServletRequest request, String clientRegistrationId) {
				return customizeKakaoRequest(resolver.resolve(request, clientRegistrationId));
			}
		};
	}

	private OAuth2AuthorizationRequest customizeKakaoRequest(OAuth2AuthorizationRequest request) {
		if (request == null || !request.getAuthorizationRequestUri().contains("kauth.kakao.com")) {
			return request;
		}
		String authorizationRequestUri = UriComponentsBuilder
				.fromUriString(request.getAuthorizationRequestUri())
				.replaceQueryParam("scope", "profile_nickname")
				.build()
				.toUriString();
		return OAuth2AuthorizationRequest.from(request)
				.authorizationRequestUri(authorizationRequestUri)
				.build();
	}
	
	@Bean
	public static PasswordEncoder passEncoder() {
		return new BCryptPasswordEncoder();
	}
}
