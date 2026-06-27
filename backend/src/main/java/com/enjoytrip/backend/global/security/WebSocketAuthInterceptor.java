package com.enjoytrip.backend.global.security;

import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.ChannelInterceptor;
import org.springframework.messaging.support.MessageHeaderAccessor;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Component;

import com.enjoytrip.backend.domain.auth.service.CustomUserDetailService;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

/**
 * STOMP CONNECT 프레임의 Authorization 헤더로 JWT를 검증하고
 * Principal을 설정한다. 이후 @MessageMapping 핸들러에서 principal.getName()
 * = 이메일로 현재 사용자를 식별할 수 있다.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class WebSocketAuthInterceptor implements ChannelInterceptor {

    private final JwtUtil jwtUtil;
    private final CustomUserDetailService userDetailService;

    @Override
    public Message<?> preSend(Message<?> message, MessageChannel channel) {
        StompHeaderAccessor accessor =
                MessageHeaderAccessor.getAccessor(message, StompHeaderAccessor.class);

        if (accessor == null || !StompCommand.CONNECT.equals(accessor.getCommand())) {
            return message;
        }

        String auth = accessor.getFirstNativeHeader("Authorization");
        if (auth == null || !auth.startsWith("Bearer ")) {
            log.warn("[WS] CONNECT without valid Authorization header");
            throw new IllegalArgumentException("WebSocket: Missing Authorization header");
        }

        String token = auth.substring(7);
        if (!jwtUtil.isTokenValid(token)) {
            log.warn("[WS] CONNECT with invalid JWT");
            throw new IllegalArgumentException("WebSocket: Invalid JWT token");
        }

        String email = jwtUtil.extractEmail(token);
        UserDetails userDetails = userDetailService.loadUserByUsername(email);
        UsernamePasswordAuthenticationToken authentication =
                new UsernamePasswordAuthenticationToken(userDetails, null, userDetails.getAuthorities());

        accessor.setUser(authentication);
        return message;
    }
}
