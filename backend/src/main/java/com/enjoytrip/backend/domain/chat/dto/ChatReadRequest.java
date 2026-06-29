package com.enjoytrip.backend.domain.chat.dto;

/** STOMP /app/groups/{id}/chat/read 페이로드 — 클라이언트가 읽은 마지막 메시지 id. */
public record ChatReadRequest(
        Long lastReadMessageId
) {
}
