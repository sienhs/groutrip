package com.enjoytrip.backend.domain.board.dto;

import java.time.LocalDateTime;
import java.util.List;

import com.enjoytrip.backend.domain.board.entity.Post;

public record PostResponse(
        Long id,
        Long authorId,
        String authorName,
        String title,
        String content,
        int commentCount,
        boolean isNotice,
        LocalDateTime createdAt,
        LocalDateTime updatedAt,
        List<CommentResponse> comments
) {
    public static PostResponse from(Post p, List<CommentResponse> comments) {
        return new PostResponse(
                p.getId(),
                p.getAuthor().getId(),
                p.getAuthor().getName(),
                p.getTitle(),
                p.getContent(),
                p.getCommentCount(),
                p.isNotice(),
                p.getCreatedAt(),
                p.getUpdatedAt(),
                comments
        );
    }

    public static PostResponse summary(Post p) {
        return new PostResponse(
                p.getId(),
                p.getAuthor().getId(),
                p.getAuthor().getName(),
                p.getTitle(),
                null,
                p.getCommentCount(),
                p.isNotice(),
                p.getCreatedAt(),
                p.getUpdatedAt(),
                null
        );
    }
}
