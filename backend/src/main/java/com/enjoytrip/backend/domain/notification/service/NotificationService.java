package com.enjoytrip.backend.domain.notification.service;

import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.enjoytrip.backend.domain.auth.entity.User;
import com.enjoytrip.backend.domain.group.service.CurrentUserResolver;
import com.enjoytrip.backend.domain.notification.dto.NotificationResponse;
import com.enjoytrip.backend.domain.notification.entity.Notification;
import com.enjoytrip.backend.domain.notification.repository.NotificationRepository;
import com.enjoytrip.backend.global.exception.BusinessException;
import com.enjoytrip.backend.global.exception.ErrorCode;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class NotificationService {

    private final NotificationRepository notificationRepository;
    private final CurrentUserResolver currentUserResolver;

    public List<NotificationResponse> findMine() {
        User user = currentUserResolver.getCurrentUser();
        return notificationRepository.findByRecipientIdOrderByCreatedAtDesc(user.getId()).stream()
                .map(NotificationResponse::from)
                .toList();
    }

    public long countUnread() {
        User user = currentUserResolver.getCurrentUser();
        return notificationRepository.countByRecipientIdAndReadAtIsNull(user.getId());
    }

    @Transactional
    public NotificationResponse markRead(Long notificationId) {
        User user = currentUserResolver.getCurrentUser();
        Notification notification = notificationRepository.findByIdAndRecipientId(notificationId, user.getId())
                .orElseThrow(() -> new BusinessException(ErrorCode.NOTIFICATION_NOT_FOUND));
        notification.markRead();
        return NotificationResponse.from(notification);
    }

    @Transactional
    public void markAllRead() {
        User user = currentUserResolver.getCurrentUser();
        notificationRepository.findByRecipientIdAndReadAtIsNull(user.getId())
                .forEach(Notification::markRead);
    }
}
