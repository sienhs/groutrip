package com.enjoytrip.backend.domain.board.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.enjoytrip.backend.domain.board.entity.Post;

public interface PostRepository extends JpaRepository<Post, Long> {
    List<Post> findByGroupIdOrderByCreatedAtDesc(Long groupId);
    Optional<Post> findByIdAndGroupId(Long id, Long groupId);
}
