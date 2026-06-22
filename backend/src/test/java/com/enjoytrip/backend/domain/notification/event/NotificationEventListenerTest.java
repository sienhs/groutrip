package com.enjoytrip.backend.domain.notification.event;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.test.util.ReflectionTestUtils;

import com.enjoytrip.backend.domain.auth.entity.User;
import com.enjoytrip.backend.domain.auth.repository.UserRepository;
import com.enjoytrip.backend.domain.group.entity.GroupMember;
import com.enjoytrip.backend.domain.group.entity.GroupRole;
import com.enjoytrip.backend.domain.group.entity.GroupStatus;
import com.enjoytrip.backend.domain.group.entity.TravelGroup;
import com.enjoytrip.backend.domain.group.repository.GroupMemberRepository;
import com.enjoytrip.backend.domain.notification.entity.Notification;
import com.enjoytrip.backend.domain.notification.repository.NotificationRepository;
import com.enjoytrip.backend.global.event.DomainEvent;
import com.enjoytrip.backend.global.event.EventType;

class NotificationEventListenerTest {

    private NotificationRepository notificationRepository;
    private GroupMemberRepository groupMemberRepository;
    private UserRepository userRepository;
    private NotificationEventListener listener;
    private TravelGroup group;
    private User actor;
    private User recipient;

    @BeforeEach
    void setUp() {
        notificationRepository = mock(NotificationRepository.class);
        groupMemberRepository = mock(GroupMemberRepository.class);
        userRepository = mock(UserRepository.class);
        listener = new NotificationEventListener(notificationRepository, groupMemberRepository, userRepository);

        group = group();
        actor = user(1L, "actor");
        recipient = user(2L, "recipient");
        when(userRepository.findById(1L)).thenReturn(Optional.of(actor));
    }

    @Test
    void eventCreatesNotificationForOtherActiveMembersOnly() {
        when(groupMemberRepository.findByTravelGroupIdAndLeftAtIsNull(1L))
                .thenReturn(List.of(member(actor), member(recipient)));

        listener.onDomainEvent(DomainEvent.of(EventType.EXPENSE_ADDED, 1L, 1L, Map.of()));

        ArgumentCaptor<List<Notification>> captor = notificationListCaptor();
        verify(notificationRepository).saveAll(captor.capture());
        assertEquals(1, captor.getValue().size());
        assertEquals(2L, captor.getValue().getFirst().getRecipient().getId());
        assertEquals("/groups/1/expenses", captor.getValue().getFirst().getTargetPath());
    }

    @Test
    void dissolvedGroupNotifiesMembersEvenAfterMembershipWasDeactivated() {
        GroupMember actorMember = member(actor);
        GroupMember recipientMember = member(recipient);
        actorMember.leave();
        recipientMember.leave();
        when(groupMemberRepository.findByTravelGroupId(1L)).thenReturn(List.of(actorMember, recipientMember));

        listener.onDomainEvent(DomainEvent.of(
                EventType.GROUP_UPDATED,
                1L,
                1L,
                Map.of("deleted", true)
        ));

        ArgumentCaptor<List<Notification>> captor = notificationListCaptor();
        verify(notificationRepository).saveAll(captor.capture());
        assertEquals(1, captor.getValue().size());
        assertEquals(2L, captor.getValue().getFirst().getRecipient().getId());
    }

    @SuppressWarnings({"unchecked", "rawtypes"})
    private ArgumentCaptor<List<Notification>> notificationListCaptor() {
        return ArgumentCaptor.forClass((Class) List.class);
    }

    private GroupMember member(User user) {
        return GroupMember.builder()
                .travelGroup(group)
                .user(user)
                .role(GroupRole.MEMBER)
                .build();
    }

    private TravelGroup group() {
        TravelGroup group = TravelGroup.builder()
                .title("Trip")
                .destination("Seoul")
                .startDate(LocalDate.of(2026, 7, 1))
                .endDate(LocalDate.of(2026, 7, 3))
                .inviteCode("ABC123")
                .status(GroupStatus.PLANNING)
                .build();
        ReflectionTestUtils.setField(group, "id", 1L);
        return group;
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
