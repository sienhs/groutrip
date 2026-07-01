package com.enjoytrip.backend.domain.auth.service;

import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

import com.enjoytrip.backend.domain.auth.repository.UserRepository;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class CustomUserDetailService implements UserDetailsService {
	// AuthService에서 순환참조 발생으로 따로 뺌.
	private final UserRepository userRepository;
	
	
	// Spring Security가 내부적으로 호출하는 메서드
	// JwtFilter가 DB유저 조회할 때 여기로 옴
	@Override
	public UserDetails loadUserByUsername(String email) throws UsernameNotFoundException {
		// FR-AUTH-06: 탈퇴한 사용자는 남아있는 Access Token으로도 인증되지 않도록 제외한다.
		// 관리자 제재로 정지된 계정도 남은 토큰으로 인증되지 않도록 함께 제외한다.
		return userRepository.findByEmail(email)
				.filter(user -> !user.isWithdrawn() && !user.isBanned())
				.map(user -> org.springframework.security.core.userdetails.User
						.withUsername(user.getEmail())
						.password(user.getPassword())
						.roles("USER")
						.build()
				).orElseThrow(() -> new UsernameNotFoundException("유저를 찾을 수 없습니다: " + email));
	}
	
}
