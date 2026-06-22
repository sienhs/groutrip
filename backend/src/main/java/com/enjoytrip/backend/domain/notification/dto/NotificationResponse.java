package com.enjoytrip.backend.domain.notification.dto;

import java.time.LocalDateTime;

import com.enjoytrip.backend.domain.notification.entity.Notification;
import com.enjoytrip.backend.global.event.EventType;

public record NotificationResponse(
        Long id,
        Long groupId,
        EventType type,
        String message,
        String targetPath,
        LocalDateTime readAt,
        LocalDateTime createdAt
) {
    public static NotificationResponse from(Notification notification) {
        return new NotificationResponse(
                notification.getId(),
                notification.getTravelGroup().getId(),
                notification.getType(),
                notification.getMessage(),
                notification.getTargetPath(),
                notification.getReadAt(),
                notification.getCreatedAt()
        );
    }
}
