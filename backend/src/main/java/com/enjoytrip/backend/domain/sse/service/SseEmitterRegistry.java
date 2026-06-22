package com.enjoytrip.backend.domain.sse.service;

import java.io.IOException;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;

import org.springframework.stereotype.Component;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

@Component
public class SseEmitterRegistry {

    private static final long EMITTER_TIMEOUT_MILLIS = 30 * 60 * 1000L;

    private final Map<Long, Set<SseEmitter>> emittersByGroup = new ConcurrentHashMap<>();

    // 그룹별 emitter를 thread-safe set에 등록하고 모든 종료 경로에서 정리한다.
    public SseEmitter add(Long groupId) {
        SseEmitter emitter = new SseEmitter(EMITTER_TIMEOUT_MILLIS);
        emittersByGroup.computeIfAbsent(groupId, ignored -> ConcurrentHashMap.newKeySet()).add(emitter);
        emitter.onCompletion(() -> remove(groupId, emitter));
        emitter.onTimeout(() -> remove(groupId, emitter));
        emitter.onError(error -> remove(groupId, emitter));
        return emitter;
    }

    public void send(Long groupId, String eventName, Object data) {
        send(groupId, null, eventName, data);
    }

    public void send(Long groupId, Long eventId, String eventName, Object data) {
        for (SseEmitter emitter : Set.copyOf(emittersByGroup.getOrDefault(groupId, Set.of()))) {
            sendTo(groupId, emitter, eventId, eventName, data);
        }
    }

    public void sendTo(Long groupId, SseEmitter emitter, String eventName, Object data) {
        sendTo(groupId, emitter, null, eventName, data);
    }

    public void sendTo(Long groupId, SseEmitter emitter, Long eventId, String eventName, Object data) {
        try {
            SseEmitter.SseEventBuilder event = SseEmitter.event().name(eventName).data(data);
            if (eventId != null) {
                event.id(Long.toString(eventId));
            }
            emitter.send(event);
        } catch (IOException | IllegalStateException exception) {
            remove(groupId, emitter);
            emitter.complete();
        }
    }

    public Set<Long> connectedGroupIds() {
        return Set.copyOf(emittersByGroup.keySet());
    }

    int emitterCount(Long groupId) {
        return emittersByGroup.getOrDefault(groupId, Set.of()).size();
    }

    private void remove(Long groupId, SseEmitter emitter) {
        Set<SseEmitter> emitters = emittersByGroup.get(groupId);
        if (emitters == null) {
            return;
        }
        emitters.remove(emitter);
        if (emitters.isEmpty()) {
            emittersByGroup.remove(groupId, emitters);
        }
    }
}
