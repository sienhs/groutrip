package com.enjoytrip.backend.domain.board.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

import com.enjoytrip.backend.domain.board.entity.Comment;

public interface CommentRepository extends JpaRepository<Comment, Long> {
    List<Comment> findByPostIdOrderByCreatedAtAsc(Long postId);
}
