package com.enjoytrip.backend.global.event;

import java.time.LocalDateTime;

// FR-SSE-02: Part A 서비스는 SSE 구현에 직접 의존하지 않고 이 이벤트 계약만 발행한다.
public record DomainEvent<T>(
        EventType type,
        Long groupId,
        Long actorId,
        T payload,
        LocalDateTime ts
) {
    public static <T> DomainEvent<T> of(EventType type, Long groupId, Long actorId, T payload) {
        return new DomainEvent<>(type, groupId, actorId, payload, LocalDateTime.now());
    }
}
