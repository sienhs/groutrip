package com.enjoytrip.backend.domain.sse.service;

import java.io.IOException;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;

import org.springframework.stereotype.Component;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import com.enjoytrip.backend.global.exception.BusinessException;
import com.enjoytrip.backend.global.exception.ErrorCode;

@Component
public class SseEmitterRegistry {

    private static final long EMITTER_TIMEOUT_MILLIS = 30 * 60 * 1000L;
    private static final int MAX_CONNECTIONS_PER_USER = 2;

    private final Map<Long, Map<Long, Set<SseEmitter>>> emittersByGroup = new ConcurrentHashMap<>();

    // 그룹별 emitter를 thread-safe set에 등록하고 모든 종료 경로에서 정리한다.
    public SseEmitter add(Long groupId, Long userId) {
        SseEmitter emitter = new SseEmitter(EMITTER_TIMEOUT_MILLIS);
        Set<SseEmitter> userEmitters = emittersByGroup
                .computeIfAbsent(groupId, ignored -> new ConcurrentHashMap<>())
                .computeIfAbsent(userId, ignored -> ConcurrentHashMap.newKeySet());
        synchronized (userEmitters) {
            if (userEmitters.size() >= MAX_CONNECTIONS_PER_USER) {
                throw new BusinessException(ErrorCode.SSE_CONNECTION_LIMIT_EXCEEDED);
            }
            userEmitters.add(emitter);
        }
        emitter.onCompletion(() -> remove(groupId, userId, emitter));
        emitter.onTimeout(() -> remove(groupId, userId, emitter));
        emitter.onError(error -> remove(groupId, userId, emitter));
        return emitter;
    }

    public void send(Long groupId, String eventName, Object data) {
        send(groupId, null, eventName, data);
    }

    public void send(Long groupId, Long eventId, String eventName, Object data) {
        Map<Long, Set<SseEmitter>> emittersByUser = emittersByGroup.get(groupId);
        if (emittersByUser == null) {
            return;
        }
        for (Map.Entry<Long, Set<SseEmitter>> entry : Map.copyOf(emittersByUser).entrySet()) {
            for (SseEmitter emitter : Set.copyOf(entry.getValue())) {
                sendTo(groupId, entry.getKey(), emitter, eventId, eventName, data);
            }
        }
    }

    public void sendTo(Long groupId, SseEmitter emitter, String eventName, Object data) {
        sendTo(groupId, emitter, null, eventName, data);
    }

    public void sendTo(Long groupId, SseEmitter emitter, Long eventId, String eventName, Object data) {
        sendTo(groupId, null, emitter, eventId, eventName, data);
    }

    private void sendTo(Long groupId, Long userId, SseEmitter emitter, Long eventId, String eventName, Object data) {
        try {
            SseEmitter.SseEventBuilder event = SseEmitter.event().name(eventName).data(data);
            if (eventId != null) {
                event.id(Long.toString(eventId));
            }
            emitter.send(event);
        } catch (IOException | IllegalStateException exception) {
            if (userId != null) {
                remove(groupId, userId, emitter);
            }
            emitter.complete();
        }
    }

    public Set<Long> connectedGroupIds() {
        return Set.copyOf(emittersByGroup.keySet());
    }

    int emitterCount(Long groupId) {
        Map<Long, Set<SseEmitter>> emittersByUser = emittersByGroup.get(groupId);
        return emittersByUser == null
                ? 0
                : emittersByUser.values().stream().mapToInt(Set::size).sum();
    }

    private void remove(Long groupId, Long userId, SseEmitter emitter) {
        Map<Long, Set<SseEmitter>> emittersByUser = emittersByGroup.get(groupId);
        if (emittersByUser == null) {
            return;
        }
        Set<SseEmitter> emitters = emittersByUser.get(userId);
        if (emitters != null) {
            emitters.remove(emitter);
            if (emitters.isEmpty()) {
                emittersByUser.remove(userId, emitters);
            }
        }
        if (emittersByUser.isEmpty()) {
            emittersByGroup.remove(groupId, emittersByUser);
        }
    }
}
