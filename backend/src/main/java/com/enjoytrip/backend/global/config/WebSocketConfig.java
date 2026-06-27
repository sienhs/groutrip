package com.enjoytrip.backend.global.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.messaging.simp.config.ChannelRegistration;
import org.springframework.messaging.simp.config.MessageBrokerRegistry;
import org.springframework.scheduling.TaskScheduler;
import org.springframework.scheduling.concurrent.ThreadPoolTaskScheduler;
import org.springframework.web.socket.config.annotation.EnableWebSocketMessageBroker;
import org.springframework.web.socket.config.annotation.StompEndpointRegistry;
import org.springframework.web.socket.config.annotation.WebSocketMessageBrokerConfigurer;

import com.enjoytrip.backend.global.security.WebSocketAuthInterceptor;

import lombok.RequiredArgsConstructor;

@Configuration
@EnableWebSocketMessageBroker
@RequiredArgsConstructor
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {

    private final WebSocketAuthInterceptor webSocketAuthInterceptor;

    @Value("${cors.allowed-origins:http://localhost:5173}")
    private String allowedOrigins;

    @Bean
    public TaskScheduler webSocketHeartbeatScheduler() {
        ThreadPoolTaskScheduler scheduler = new ThreadPoolTaskScheduler();
        scheduler.setPoolSize(1);
        scheduler.setThreadNamePrefix("ws-heartbeat-");
        scheduler.initialize();
        return scheduler;
    }

    @Override
    public void configureMessageBroker(MessageBrokerRegistry config) {
        // 인-메모리 브로커. /topic/** 구독 → 그룹 이벤트·채팅 수신.
        config.enableSimpleBroker("/topic")
              .setHeartbeatValue(new long[]{25000, 25000})
              .setTaskScheduler(webSocketHeartbeatScheduler());
        // 클라이언트가 서버로 메시지를 보낼 때 사용하는 prefix.
        config.setApplicationDestinationPrefixes("/app");
    }

    @Override
    public void registerStompEndpoints(StompEndpointRegistry registry) {
        // 네이티브 WebSocket 엔드포인트. 클라이언트는 ws(s)://host/ws 로 연결한다.
        registry.addEndpoint("/ws")
                .setAllowedOriginPatterns(allowedOrigins.split(","));
    }

    @Override
    public void configureClientInboundChannel(ChannelRegistration registration) {
        // STOMP CONNECT 프레임에서 JWT를 검증해 Principal을 설정한다.
        registration.interceptors(webSocketAuthInterceptor);
    }
}
