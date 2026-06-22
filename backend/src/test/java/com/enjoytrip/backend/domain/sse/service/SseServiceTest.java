package com.enjoytrip.backend.domain.sse.service;

import static org.junit.jupiter.api.Assertions.assertSame;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.Set;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import com.enjoytrip.backend.domain.auth.entity.User;
import com.enjoytrip.backend.domain.group.service.CurrentUserResolver;
import com.enjoytrip.backend.domain.group.service.GroupAccessValidator;
import com.enjoytrip.backend.domain.sse.dto.SseEventPayload;
import com.enjoytrip.backend.global.event.DomainEvent;
import com.enjoytrip.backend.global.event.EventType;

class SseServiceTest {

    private SseEmitterRegistry emitterRegistry;
    private GroupAccessValidator groupAccessValidator;
    private SseService sseService;

    @BeforeEach
    void setUp() {
        emitterRegistry = mock(SseEmitterRegistry.class);
        CurrentUserResolver currentUserResolver = mock(CurrentUserResolver.class);
        groupAccessValidator = mock(GroupAccessValidator.class);

        User user = User.builder()
                .email("member@test.com")
                .password("encoded")
                .name("member")
                .build();
        ReflectionTestUtils.setField(user, "id", 7L);
        when(currentUserResolver.getCurrentUser()).thenReturn(user);

        sseService = new SseService(emitterRegistry, currentUserResolver, groupAccessValidator);
    }

    @Test
    void subscribeValidatesMemberAndSendsConnectedOnlyToNewEmitter() {
        SseEmitter emitter = new SseEmitter();
        when(emitterRegistry.add(15L)).thenReturn(emitter);

        SseEmitter result = sseService.subscribe(15L);

        assertSame(emitter, result);
        verify(groupAccessValidator).validateMember(15L, 7L);
        verify(emitterRegistry).sendTo(eq(15L), eq(emitter), eq("CONNECTED"), org.mockito.ArgumentMatchers.any(SseEventPayload.class));
    }

    @Test
    void broadcastUsesDomainEventTypeAsSseEventName() {
        DomainEvent<String> event = DomainEvent.of(EventType.EXPENSE_ADDED, 3L, 7L, "payload");

        sseService.broadcast(event);

        verify(emitterRegistry).send(eq(3L), eq("EXPENSE_ADDED"), org.mockito.ArgumentMatchers.any(SseEventPayload.class));
    }

    @Test
    void heartbeatSendsToEveryConnectedGroup() {
        when(emitterRegistry.connectedGroupIds()).thenReturn(Set.of(1L, 2L));

        sseService.heartbeat();

        verify(emitterRegistry).send(eq(1L), eq("HEARTBEAT"), org.mockito.ArgumentMatchers.any(SseEventPayload.class));
        verify(emitterRegistry).send(eq(2L), eq("HEARTBEAT"), org.mockito.ArgumentMatchers.any(SseEventPayload.class));
    }
}
