package com.enjoytrip.backend.domain.sse.service;

import static org.junit.jupiter.api.Assertions.assertEquals;

import java.util.List;

import org.junit.jupiter.api.Test;

class SseEventStoreTest {

    @Test
    void returnsOnlyEventsCreatedAfterLastEventIdInOrder() {
        SseEventStore store = new SseEventStore();
        SseEventStore.StoredSseEvent first = store.append(1L, "FIRST", "a");
        SseEventStore.StoredSseEvent second = store.append(1L, "SECOND", "b");
        SseEventStore.StoredSseEvent third = store.append(1L, "THIRD", "c");

        List<SseEventStore.StoredSseEvent> events = store.findAfter(1L, first.id());

        assertEquals(List.of(second, third), events);
    }

    @Test
    void retainsOnlyLatestOneHundredEventsPerGroup() {
        SseEventStore store = new SseEventStore();
        for (int index = 1; index <= 105; index++) {
            store.append(1L, "EVENT", index);
        }

        List<SseEventStore.StoredSseEvent> events = store.findAfter(1L, 0L);

        assertEquals(100, events.size());
        assertEquals(6, events.getFirst().data());
        assertEquals(105, events.getLast().data());
    }
}
