package com.enjoytrip.backend.domain.chat.entity;

import java.time.LocalDateTime;

import org.hibernate.annotations.UpdateTimestamp;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

/**
 * 멤버별 그룹 채팅 읽음 위치. (group_id, user_id) 당 1행으로, 그 멤버가 읽은 마지막 메시지 id를 보관한다.
 * 각 메시지의 "안 읽은 인원 수"는 이 값들과 메시지 id를 비교해 산출한다.
 */
@Entity
@Table(name = "chat_reads", uniqueConstraints = {
        @UniqueConstraint(columnNames = {"group_id", "user_id"})
})
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class ChatRead {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "group_id", nullable = false)
    private Long groupId;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column(name = "last_read_message_id", nullable = false)
    private Long lastReadMessageId;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    private ChatRead(Long groupId, Long userId) {
        this.groupId = groupId;
        this.userId = userId;
        this.lastReadMessageId = 0L;
    }

    public static ChatRead of(Long groupId, Long userId) {
        return new ChatRead(groupId, userId);
    }

    /** 더 최신 메시지를 읽었을 때만 전진시킨다. 변경됐으면 true. */
    public boolean advanceTo(Long messageId) {
        if (messageId != null && messageId > this.lastReadMessageId) {
            this.lastReadMessageId = messageId;
            return true;
        }
        return false;
    }
}
