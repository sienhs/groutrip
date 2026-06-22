package com.enjoytrip.backend.domain.mypage.dto;

import java.time.LocalDateTime;

import com.enjoytrip.backend.domain.mypage.entity.Retrospective;

/**
 * FR-MYPAGE-04: 회고 응답.
 */
public record RetrospectiveResponse(
        Long id,
        Long groupId,
        String groupTitle,
        String content,
        int rating,
        LocalDateTime createdAt
) {

    public static RetrospectiveResponse from(Retrospective retrospective) {
        return new RetrospectiveResponse(
                retrospective.getId(),
                retrospective.getTravelGroup().getId(),
                retrospective.getTravelGroup().getTitle(),
                retrospective.getContent(),
                retrospective.getRating(),
                retrospective.getCreatedAt()
        );
    }
}
