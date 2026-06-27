package com.enjoytrip.backend.domain.ws.dto;

import java.time.LocalDateTime;

import com.enjoytrip.backend.global.event.DomainEvent;

/** 모든 WebSocket 이벤트 메시지의 공통 envelope. SSE payload와 동일한 구조를 유지해 프론트 호환성 보장. */
public record WsEventPayload(
        String type,
        Long groupId,
        Long actorId,
        String actorName,
        Object payload,
        LocalDateTime ts
) {
    public static WsEventPayload from(DomainEvent<?> event, String actorName) {
        return new WsEventPayload(
                event.type().name(),
                event.groupId(),
                event.actorId(),
                actorName,
                event.payload(),
                event.ts()
        );
    }

    public static WsEventPayload system(String type, Long groupId) {
        return new WsEventPayload(type, groupId, null, null, null, LocalDateTime.now());
    }
}
