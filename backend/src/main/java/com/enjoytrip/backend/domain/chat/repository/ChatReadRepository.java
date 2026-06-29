package com.enjoytrip.backend.domain.chat.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.enjoytrip.backend.domain.chat.entity.ChatRead;

public interface ChatReadRepository extends JpaRepository<ChatRead, Long> {

    Optional<ChatRead> findByGroupIdAndUserId(Long groupId, Long userId);

    List<ChatRead> findByGroupId(Long groupId);
}
