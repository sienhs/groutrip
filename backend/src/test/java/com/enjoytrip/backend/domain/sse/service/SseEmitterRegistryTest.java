package com.enjoytrip.backend.domain.sse.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

import org.junit.jupiter.api.Test;

import com.enjoytrip.backend.global.exception.BusinessException;
import com.enjoytrip.backend.global.exception.ErrorCode;

class SseEmitterRegistryTest {

    @Test
    void limitsConcurrentConnectionsPerGroupAndUser() {
        SseEmitterRegistry registry = new SseEmitterRegistry();
        registry.add(1L, 10L);
        registry.add(1L, 10L);

        BusinessException exception = assertThrows(
                BusinessException.class,
                () -> registry.add(1L, 10L)
        );

        assertEquals(ErrorCode.SSE_CONNECTION_LIMIT_EXCEEDED, exception.getErrorCode());
        assertEquals(2, registry.emitterCount(1L));
    }

    @Test
    void allowsConnectionsFromDifferentUsers() {
        SseEmitterRegistry registry = new SseEmitterRegistry();
        registry.add(1L, 10L);
        registry.add(1L, 20L);

        assertEquals(2, registry.emitterCount(1L));
    }
}
