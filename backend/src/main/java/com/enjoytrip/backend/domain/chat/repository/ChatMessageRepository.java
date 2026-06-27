package com.enjoytrip.backend.domain.chat.repository;

import java.util.List;

import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.enjoytrip.backend.domain.chat.entity.ChatMessage;

public interface ChatMessageRepository extends JpaRepository<ChatMessage, Long> {

    /** 그룹의 최신 메시지를 최대 limit개 반환(커서 페이징 — before ID 미지정 시 최신부터). */
    @Query("SELECT m FROM ChatMessage m WHERE m.group.id = :groupId ORDER BY m.id DESC")
    List<ChatMessage> findLatestByGroup(@Param("groupId") Long groupId, Pageable pageable);

    /** before ID보다 오래된 메시지(무한 스크롤 이전 페이지 로드). */
    @Query("SELECT m FROM ChatMessage m WHERE m.group.id = :groupId AND m.id < :before ORDER BY m.id DESC")
    List<ChatMessage> findBeforeByGroup(
            @Param("groupId") Long groupId,
            @Param("before") Long before,
            Pageable pageable);
}
