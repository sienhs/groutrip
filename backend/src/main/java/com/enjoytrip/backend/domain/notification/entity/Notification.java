package com.enjoytrip.backend.domain.notification.entity;

import java.time.LocalDateTime;

import com.enjoytrip.backend.domain.auth.entity.User;
import com.enjoytrip.backend.domain.group.entity.TravelGroup;
import com.enjoytrip.backend.global.entity.BaseEntity;
import com.enjoytrip.backend.global.event.EventType;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "notifications")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Notification extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "group_id", nullable = false)
    private TravelGroup travelGroup;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "recipient_id", nullable = false)
    private User recipient;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 40)
    private EventType type;

    @Column(nullable = false, length = 255)
    private String message;

    @Column(nullable = false, length = 255)
    private String targetPath;

    private LocalDateTime readAt;

    @Builder
    private Notification(
            TravelGroup travelGroup,
            User recipient,
            EventType type,
            String message,
            String targetPath
    ) {
        this.travelGroup = travelGroup;
        this.recipient = recipient;
        this.type = type;
        this.message = message;
        this.targetPath = targetPath;
    }

    // 이미 읽은 알림은 읽음 시각을 유지해 중복 요청을 안전하게 처리한다.
    public void markRead() {
        if (readAt == null) {
            readAt = LocalDateTime.now();
        }
    }
}
