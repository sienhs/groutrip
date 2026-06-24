package com.enjoytrip.backend.domain.sse.service;

import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import com.enjoytrip.backend.domain.auth.entity.User;
import com.enjoytrip.backend.domain.group.service.CurrentUserResolver;
import com.enjoytrip.backend.domain.group.service.GroupAccessValidator;
import com.enjoytrip.backend.domain.sse.dto.SseEventPayload;
import com.enjoytrip.backend.global.event.DomainEvent;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class SseService {

    private final SseEmitterRegistry emitterRegistry;
    private final SseEventStore eventStore;
    private final CurrentUserResolver currentUserResolver;
    private final GroupAccessValidator groupAccessValidator;
    private final com.enjoytrip.backend.domain.auth.repository.UserRepository userRepository;

    // FR-SSE-01: 그룹 멤버만 연결하며 CONNECTED 이벤트를 즉시 보낸다.
    @Transactional(readOnly = true)
    public SseEmitter subscribe(Long groupId) {
        return subscribe(groupId, null);
    }

    @Transactional(readOnly = true)
    public SseEmitter subscribe(Long groupId, Long lastEventId) {
        User user = currentUserResolver.getCurrentUser();
        groupAccessValidator.validateMember(groupId, user.getId());

        synchronized (eventStore.lockFor(groupId)) {
            SseEmitter emitter = emitterRegistry.add(groupId, user.getId());
            if (lastEventId != null) {
                for (SseEventStore.StoredSseEvent event : eventStore.findAfter(groupId, lastEventId)) {
                    emitterRegistry.sendTo(groupId, emitter, event.id(), event.eventName(), event.data());
                }
            }
            emitterRegistry.sendTo(groupId, emitter, "CONNECTED", SseEventPayload.system("CONNECTED", groupId));
            return emitter;
        }
    }

    public void broadcast(DomainEvent<?> event) {
        // 토스트/알림에 실제 닉네임이 보이도록 actor 이름을 payload에 담는다(프론트의 멤버 캐시 의존 제거).
        String actorName = event.actorId() == null
                ? null
                : userRepository.findById(event.actorId()).map(u -> u.getName()).orElse(null);
        synchronized (eventStore.lockFor(event.groupId())) {
            SseEventStore.StoredSseEvent storedEvent = eventStore.append(
                    event.groupId(),
                    event.type().name(),
                    SseEventPayload.from(event, actorName)
            );
            emitterRegistry.send(
                    event.groupId(),
                    storedEvent.id(),
                    storedEvent.eventName(),
                    storedEvent.data()
            );
        }
    }

    // FR-SSE-01: 연결 생존 여부를 확인할 수 있도록 모든 활성 그룹에 30초마다 heartbeat를 보낸다.
    @Scheduled(fixedRate = 30_000L)
    public void heartbeat() {
        for (Long groupId : emitterRegistry.connectedGroupIds()) {
            emitterRegistry.send(groupId, "HEARTBEAT", SseEventPayload.system("HEARTBEAT", groupId));
        }
    }
}
