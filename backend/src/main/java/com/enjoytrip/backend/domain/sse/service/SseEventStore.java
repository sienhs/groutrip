package com.enjoytrip.backend.domain.sse.service;

import java.util.ArrayDeque;
import java.util.ArrayList;
import java.util.Deque;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicLong;

import org.springframework.stereotype.Component;

// FR-SSE-04: 단일 서버 재접속 복구를 위해 그룹별 최근 이벤트를 제한된 크기로 보관한다.
@Component
public class SseEventStore {

    private static final int MAX_EVENTS_PER_GROUP = 100;

    private final AtomicLong eventSequence = new AtomicLong();
    private final Map<Long, Deque<StoredSseEvent>> eventsByGroup = new ConcurrentHashMap<>();
    private final Map<Long, Object> locksByGroup = new ConcurrentHashMap<>();

    public Object lockFor(Long groupId) {
        return locksByGroup.computeIfAbsent(groupId, ignored -> new Object());
    }

    public StoredSseEvent append(Long groupId, String eventName, Object data) {
        synchronized (lockFor(groupId)) {
            StoredSseEvent event = new StoredSseEvent(eventSequence.incrementAndGet(), eventName, data);
            Deque<StoredSseEvent> events = eventsByGroup.computeIfAbsent(groupId, ignored -> new ArrayDeque<>());
            events.addLast(event);
            while (events.size() > MAX_EVENTS_PER_GROUP) {
                events.removeFirst();
            }
            return event;
        }
    }

    public List<StoredSseEvent> findAfter(Long groupId, long lastEventId) {
        synchronized (lockFor(groupId)) {
            Deque<StoredSseEvent> events = eventsByGroup.get(groupId);
            if (events == null) {
                return List.of();
            }

            List<StoredSseEvent> missedEvents = new ArrayList<>();
            for (StoredSseEvent event : events) {
                if (event.id() > lastEventId) {
                    missedEvents.add(event);
                }
            }
            return List.copyOf(missedEvents);
        }
    }

    public record StoredSseEvent(long id, String eventName, Object data) {
    }
}
