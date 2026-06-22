package com.enjoytrip.backend.domain.auth.service;

import java.time.Duration;
import java.time.Instant;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

import org.springframework.stereotype.Component;
import org.springframework.scheduling.annotation.Scheduled;

import com.enjoytrip.backend.global.exception.BusinessException;
import com.enjoytrip.backend.global.exception.ErrorCode;

// FR-AUTH-02: IP별 연속 로그인 실패를 제한해 무차별 대입 공격을 완화한다.
@Component
public class LoginAttemptService {

    private static final int MAX_FAILURES = 5;
    private static final Duration BLOCK_DURATION = Duration.ofMinutes(5);

    private final Map<String, AttemptState> attemptsByClient = new ConcurrentHashMap<>();

    public void checkAllowed(String clientKey) {
        AttemptState state = attemptsByClient.get(clientKey);
        if (state == null) {
            return;
        }
        Instant now = Instant.now();
        if (state.blockedUntil() != null && state.blockedUntil().isAfter(now)) {
            throw new BusinessException(ErrorCode.TOO_MANY_LOGIN_ATTEMPTS);
        }
        if (state.isExpired(now)) {
            attemptsByClient.remove(clientKey, state);
        }
    }

    public void recordFailure(String clientKey) {
        Instant now = Instant.now();
        attemptsByClient.compute(clientKey, (key, existing) -> {
            int failures = existing == null || existing.isExpired(now) ? 1 : existing.failures() + 1;
            Instant blockedUntil = failures >= MAX_FAILURES ? now.plus(BLOCK_DURATION) : null;
            return new AttemptState(failures, now, blockedUntil);
        });
    }

    public void recordSuccess(String clientKey) {
        attemptsByClient.remove(clientKey);
    }

    @Scheduled(fixedRate = 10 * 60 * 1000L)
    public void cleanupExpiredAttempts() {
        Instant now = Instant.now();
        attemptsByClient.entrySet().removeIf(entry -> entry.getValue().isExpired(now));
    }

    private record AttemptState(int failures, Instant lastFailureAt, Instant blockedUntil) {
        private boolean isExpired(Instant now) {
            return !lastFailureAt.plus(BLOCK_DURATION).isAfter(now);
        }
    }
}
