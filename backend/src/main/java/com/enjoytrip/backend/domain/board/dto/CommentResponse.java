package com.enjoytrip.backend.domain.board.dto;

import java.time.LocalDateTime;

import com.enjoytrip.backend.domain.board.entity.Comment;

public record CommentResponse(
        Long id,
        Long authorId,
        String authorName,
        String content,
        LocalDateTime createdAt
) {
    public static CommentResponse from(Comment c) {
        return new CommentResponse(
                c.getId(),
                c.getAuthor().getId(),
                c.getAuthor().getName(),
                c.getContent(),
                c.getCreatedAt()
        );
    }
}
