package com.enjoytrip.backend.domain.chat.dto;

/** 멤버 1명의 읽음 위치. 프론트가 메시지별 "안 읽은 인원 수"를 계산하는 데 사용한다. */
public record ChatReadResponse(
        Long userId,
        Long lastReadMessageId
) {
}
