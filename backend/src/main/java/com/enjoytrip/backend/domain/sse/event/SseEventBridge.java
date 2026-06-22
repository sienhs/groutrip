package com.enjoytrip.backend.domain.sse.event;

import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

import com.enjoytrip.backend.domain.sse.service.SseService;
import com.enjoytrip.backend.global.event.DomainEvent;

import lombok.RequiredArgsConstructor;

@Component
@RequiredArgsConstructor
public class SseEventBridge {

    private final SseService sseService;

    // 도메인 트랜잭션이 커밋된 뒤에만 SSE로 전파해 롤백된 변경이 보이지 않게 한다.
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT, fallbackExecution = true)
    public void onDomainEvent(DomainEvent<?> event) {
        sseService.broadcast(event);
    }
}
