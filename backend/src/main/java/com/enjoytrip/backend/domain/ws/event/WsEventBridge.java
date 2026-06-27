package com.enjoytrip.backend.domain.ws.event;

import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

import com.enjoytrip.backend.domain.auth.repository.UserRepository;
import com.enjoytrip.backend.domain.ws.dto.WsEventPayload;
import com.enjoytrip.backend.global.event.DomainEvent;

import lombok.RequiredArgsConstructor;

/**
 * 도메인 트랜잭션 커밋 후 WebSocket STOMP 토픽으로 이벤트를 브로드캐스트한다.
 * 구독 경로: /topic/group/{groupId}
 */
@Component
@RequiredArgsConstructor
public class WsEventBridge {

    private final SimpMessagingTemplate messagingTemplate;
    private final UserRepository userRepository;

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT, fallbackExecution = true)
    public void onDomainEvent(DomainEvent<?> event) {
        String actorName = event.actorId() == null
                ? null
                : userRepository.findById(event.actorId()).map(u -> u.getName()).orElse(null);

        WsEventPayload payload = WsEventPayload.from(event, actorName);
        messagingTemplate.convertAndSend("/topic/group/" + event.groupId(), payload);
    }
}
