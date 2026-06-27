package com.enjoytrip.backend.domain.chat.dto;

import java.time.LocalDateTime;

import com.enjoytrip.backend.domain.chat.entity.ChatMessage;

public record ChatMessageResponse(
        Long id,
        Long senderId,
        String senderName,
        String content,
        LocalDateTime createdAt
) {
    public static ChatMessageResponse from(ChatMessage m) {
        return new ChatMessageResponse(
                m.getId(),
                m.getSender().getId(),
                m.getSender().getName(),
                m.getContent(),
                m.getCreatedAt()
        );
    }
}
