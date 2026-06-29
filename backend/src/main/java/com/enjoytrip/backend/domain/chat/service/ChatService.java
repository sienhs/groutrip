package com.enjoytrip.backend.domain.chat.service;

import java.security.Principal;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import org.springframework.data.domain.PageRequest;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.enjoytrip.backend.domain.auth.entity.User;
import com.enjoytrip.backend.domain.auth.repository.UserRepository;
import com.enjoytrip.backend.domain.chat.dto.ChatMessageResponse;
import com.enjoytrip.backend.domain.chat.dto.ChatReadResponse;
import com.enjoytrip.backend.domain.chat.dto.ChatSendRequest;
import com.enjoytrip.backend.domain.chat.entity.ChatMessage;
import com.enjoytrip.backend.domain.chat.entity.ChatRead;
import com.enjoytrip.backend.domain.chat.repository.ChatMessageRepository;
import com.enjoytrip.backend.domain.chat.repository.ChatReadRepository;
import com.enjoytrip.backend.domain.group.entity.TravelGroup;
import com.enjoytrip.backend.domain.group.repository.GroupMemberRepository;
import com.enjoytrip.backend.domain.group.repository.TravelGroupRepository;
import com.enjoytrip.backend.domain.group.service.GroupAccessValidator;
import com.enjoytrip.backend.global.exception.BusinessException;
import com.enjoytrip.backend.global.exception.ErrorCode;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
@Transactional
public class ChatService {

    private static final int PAGE_SIZE = 50;

    private final ChatMessageRepository chatMessageRepository;
    private final ChatReadRepository chatReadRepository;
    private final TravelGroupRepository travelGroupRepository;
    private final UserRepository userRepository;
    private final GroupMemberRepository groupMemberRepository;
    private final GroupAccessValidator groupAccessValidator;
    private final SimpMessagingTemplate messagingTemplate;

    /** 최신 메시지 최대 50개 반환(또는 before ID 이전 50개). */
    @Transactional(readOnly = true)
    public List<ChatMessageResponse> getHistory(Long groupId, Long before) {
        List<ChatMessage> messages = before == null
                ? chatMessageRepository.findLatestByGroup(groupId, PageRequest.of(0, PAGE_SIZE))
                : chatMessageRepository.findBeforeByGroup(groupId, before, PageRequest.of(0, PAGE_SIZE));
        // DB에서 DESC로 가져온 것을 클라이언트에서 오름차순(오래된 것 위)으로 보여주도록 역순.
        return messages.reversed().stream().map(ChatMessageResponse::from).toList();
    }

    /** STOMP /app/groups/{id}/chat 에서 호출. 저장 + 브로드캐스트. */
    public void send(Long groupId, Principal principal, ChatSendRequest request) {
        User sender = findUserByPrincipal(principal);
        groupAccessValidator.validateMember(groupId, sender.getId());

        TravelGroup group = travelGroupRepository.findByIdAndDeletedAtIsNull(groupId)
                .orElseThrow(() -> new BusinessException(ErrorCode.GROUP_NOT_FOUND));

        ChatMessage message = chatMessageRepository.save(
                ChatMessage.builder()
                        .group(group)
                        .sender(sender)
                        .content(request.content().trim())
                        .build()
        );

        ChatMessageResponse response = ChatMessageResponse.from(message);
        messagingTemplate.convertAndSend("/topic/group/" + groupId + "/chat", response);
    }

    /**
     * 그룹 채팅의 멤버별 읽음 위치를 반환한다(활성 멤버 전원, 기록 없으면 0).
     * 프론트는 메시지 m에 대해 (senderId 제외) lastReadMessageId < m.id 인 멤버 수를 "안 읽음"으로 표시한다.
     */
    @Transactional(readOnly = true)
    public List<ChatReadResponse> getReads(Long groupId, Principal principal) {
        User user = findUserByPrincipal(principal);
        groupAccessValidator.validateMember(groupId, user.getId());

        Map<Long, Long> readMap = chatReadRepository.findByGroupId(groupId).stream()
                .collect(Collectors.toMap(ChatRead::getUserId, ChatRead::getLastReadMessageId));

        return groupMemberRepository.findByTravelGroupIdAndLeftAtIsNull(groupId).stream()
                .map(m -> m.getUser().getId())
                .map(uid -> new ChatReadResponse(uid, readMap.getOrDefault(uid, 0L)))
                .toList();
    }

    /** 멤버의 읽음 위치를 전진시키고(더 최신일 때만) 변경 시 그룹에 브로드캐스트한다. */
    public void markRead(Long groupId, Principal principal, Long lastReadMessageId) {
        if (lastReadMessageId == null || lastReadMessageId <= 0) {
            return;
        }
        User user = findUserByPrincipal(principal);
        groupAccessValidator.validateMember(groupId, user.getId());

        ChatRead read = chatReadRepository.findByGroupIdAndUserId(groupId, user.getId())
                .orElseGet(() -> ChatRead.of(groupId, user.getId()));
        boolean changed = read.advanceTo(lastReadMessageId);
        if (!changed && read.getId() != null) {
            return; // 이미 같은 위치 이상 → 저장/브로드캐스트 생략
        }
        chatReadRepository.save(read);

        messagingTemplate.convertAndSend(
                "/topic/group/" + groupId + "/chat/read",
                new ChatReadResponse(user.getId(), read.getLastReadMessageId()));
    }

    private User findUserByPrincipal(Principal principal) {
        String email = principal.getName();
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new BusinessException(ErrorCode.USER_NOT_FOUND));
    }
}
