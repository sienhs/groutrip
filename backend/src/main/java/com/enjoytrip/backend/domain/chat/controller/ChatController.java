package com.enjoytrip.backend.domain.chat.controller;

import java.security.Principal;
import java.util.List;

import org.springframework.http.ResponseEntity;
import org.springframework.messaging.handler.annotation.DestinationVariable;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.enjoytrip.backend.domain.chat.dto.ChatMessageResponse;
import com.enjoytrip.backend.domain.chat.dto.ChatReadRequest;
import com.enjoytrip.backend.domain.chat.dto.ChatReadResponse;
import com.enjoytrip.backend.domain.chat.dto.ChatSendRequest;
import com.enjoytrip.backend.domain.chat.service.ChatService;
import com.enjoytrip.backend.global.response.ApiResponse;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/groups/{groupId}/chat")
@RequiredArgsConstructor
public class ChatController {

    private final ChatService chatService;

    /** 채팅 히스토리 조회 (REST). before 미지정 시 최신 50개, 지정 시 그 이전 50개. */
    @GetMapping("/messages")
    public ResponseEntity<ApiResponse<List<ChatMessageResponse>>> getMessages(
            @PathVariable Long groupId,
            @RequestParam(required = false) Long before
    ) {
        return ResponseEntity.ok(ApiResponse.success("OK", chatService.getHistory(groupId, before)));
    }

    /**
     * 채팅 메시지 전송 (STOMP).
     * 클라이언트: stompClient.publish({ destination: '/app/groups/{id}/chat', body: JSON.stringify({content}) })
     * 브로드캐스트: /topic/group/{id}/chat
     */
    @MessageMapping("/groups/{groupId}/chat")
    public void sendMessage(
            @DestinationVariable Long groupId,
            @Payload @Valid ChatSendRequest request,
            Principal principal
    ) {
        chatService.send(groupId, principal, request);
    }

    /** 읽음 상태 조회 (REST). 활성 멤버별 마지막으로 읽은 메시지 id 목록. */
    @GetMapping("/reads")
    public ResponseEntity<ApiResponse<List<ChatReadResponse>>> getReads(
            @PathVariable Long groupId,
            Principal principal
    ) {
        return ResponseEntity.ok(ApiResponse.success("OK", chatService.getReads(groupId, principal)));
    }

    /**
     * 읽음 처리 (STOMP).
     * 클라이언트: stompClient.publish({ destination: '/app/groups/{id}/chat/read', body: JSON.stringify({lastReadMessageId}) })
     * 브로드캐스트: /topic/group/{id}/chat/read
     */
    @MessageMapping("/groups/{groupId}/chat/read")
    public void markRead(
            @DestinationVariable Long groupId,
            @Payload ChatReadRequest request,
            Principal principal
    ) {
        chatService.markRead(groupId, principal, request.lastReadMessageId());
    }
}
