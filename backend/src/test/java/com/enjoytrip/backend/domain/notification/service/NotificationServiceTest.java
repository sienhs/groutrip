package com.enjoytrip.backend.domain.notification.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import java.time.LocalDate;
import java.util.Optional;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import com.enjoytrip.backend.domain.auth.entity.User;
import com.enjoytrip.backend.domain.group.entity.GroupStatus;
import com.enjoytrip.backend.domain.group.entity.TravelGroup;
import com.enjoytrip.backend.domain.group.service.CurrentUserResolver;
import com.enjoytrip.backend.domain.notification.dto.NotificationResponse;
import com.enjoytrip.backend.domain.notification.entity.Notification;
import com.enjoytrip.backend.domain.notification.repository.NotificationRepository;
import com.enjoytrip.backend.global.event.EventType;
import com.enjoytrip.backend.global.exception.BusinessException;
import com.enjoytrip.backend.global.exception.ErrorCode;

class NotificationServiceTest {

    private NotificationRepository notificationRepository;
    private CurrentUserResolver currentUserResolver;
    private NotificationService notificationService;

    @BeforeEach
    void setUp() {
        notificationRepository = mock(NotificationRepository.class);
        currentUserResolver = mock(CurrentUserResolver.class);
        notificationService = new NotificationService(notificationRepository, currentUserResolver);
    }

    @Test
    void markReadUpdatesOnlyCurrentUsersNotification() {
        User user = user(1L, "member");
        Notification notification = notification(10L, user);
        when(currentUserResolver.getCurrentUser()).thenReturn(user);
        when(notificationRepository.findByIdAndRecipientId(10L, 1L)).thenReturn(Optional.of(notification));

        NotificationResponse result = notificationService.markRead(10L);

        assertNotNull(result.readAt());
        assertEquals(10L, result.id());
    }

    @Test
    void markReadHidesAnotherUsersNotificationAsNotFound() {
        User user = user(1L, "member");
        when(currentUserResolver.getCurrentUser()).thenReturn(user);
        when(notificationRepository.findByIdAndRecipientId(99L, 1L)).thenReturn(Optional.empty());

        BusinessException exception = assertThrows(
                BusinessException.class,
                () -> notificationService.markRead(99L)
        );

        assertEquals(ErrorCode.NOTIFICATION_NOT_FOUND, exception.getErrorCode());
    }

    private Notification notification(Long id, User recipient) {
        TravelGroup group = TravelGroup.builder()
                .title("Trip")
                .destination("Seoul")
                .startDate(LocalDate.of(2026, 7, 1))
                .endDate(LocalDate.of(2026, 7, 3))
                .inviteCode("ABC123")
                .status(GroupStatus.PLANNING)
                .build();
        ReflectionTestUtils.setField(group, "id", 1L);

        Notification notification = Notification.builder()
                .travelGroup(group)
                .recipient(recipient)
                .type(EventType.EXPENSE_ADDED)
                .message("지출이 등록되었습니다.")
                .targetPath("/groups/1/expenses")
                .build();
        ReflectionTestUtils.setField(notification, "id", id);
        return notification;
    }

    private User user(Long id, String name) {
        User user = User.builder()
                .email(name + "@test.com")
                .password("encoded")
                .name(name)
                .build();
        ReflectionTestUtils.setField(user, "id", id);
        return user;
    }
}
