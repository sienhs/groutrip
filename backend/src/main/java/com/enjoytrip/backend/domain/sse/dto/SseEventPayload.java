package com.enjoytrip.backend.domain.sse.dto;

import java.time.LocalDateTime;

import com.enjoytrip.backend.global.event.DomainEvent;

// FR-SSE-02: 모든 SSE 메시지는 클라이언트가 동일하게 처리할 수 있는 envelope를 사용한다.
public record SseEventPayload(
        String type,
        Long groupId,
        Long actorId,
        String actorName,
        Object payload,
        LocalDateTime ts
) {
    public static SseEventPayload from(DomainEvent<?> event, String actorName) {
        return new SseEventPayload(
                event.type().name(),
                event.groupId(),
                event.actorId(),
                actorName,
                event.payload(),
                event.ts()
        );
    }

    public static SseEventPayload system(String type, Long groupId) {
        return new SseEventPayload(type, groupId, null, null, null, LocalDateTime.now());
    }
}
