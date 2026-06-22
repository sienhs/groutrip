package com.enjoytrip.backend.domain.sse.event;

import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;

import org.junit.jupiter.api.Test;

import com.enjoytrip.backend.domain.sse.service.SseService;
import com.enjoytrip.backend.global.event.DomainEvent;
import com.enjoytrip.backend.global.event.EventType;

class SseEventBridgeTest {

    @Test
    void domainEventIsForwardedWithoutDomainDependingOnSseImplementation() {
        SseService sseService = mock(SseService.class);
        SseEventBridge bridge = new SseEventBridge(sseService);
        DomainEvent<String> event = DomainEvent.of(EventType.GROUP_UPDATED, 1L, 2L, "payload");

        bridge.onDomainEvent(event);

        verify(sseService).broadcast(event);
    }
}
