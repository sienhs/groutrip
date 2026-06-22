package com.enjoytrip.backend.domain.settlement.entity;

import java.time.LocalDateTime;

import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import com.enjoytrip.backend.domain.auth.entity.User;
import com.enjoytrip.backend.domain.group.entity.TravelGroup;
import com.enjoytrip.backend.global.exception.BusinessException;
import com.enjoytrip.backend.global.exception.ErrorCode;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EntityListeners;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "settlements", uniqueConstraints = {
        @UniqueConstraint(columnNames = {"group_id", "from_user_id", "to_user_id"})
})
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@EntityListeners(AuditingEntityListener.class)
public class Settlement {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "group_id", nullable = false)
    private TravelGroup travelGroup;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "from_user_id", nullable = false)
    private User fromUser;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "to_user_id", nullable = false)
    private User toUser;

    @Column(nullable = false)
    private Long amount;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private SettlementStatus status;

    private LocalDateTime senderConfirmedAt;
    private LocalDateTime receiverConfirmedAt;

    @CreatedDate
    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @LastModifiedDate
    @Column(nullable = false)
    private LocalDateTime updatedAt;

    @Builder
    private Settlement(TravelGroup travelGroup, User fromUser, User toUser, Long amount) {
        this.travelGroup = travelGroup;
        this.fromUser = fromUser;
        this.toUser = toUser;
        this.amount = amount;
        this.status = SettlementStatus.PENDING;
    }

    // 송금자 본인이 완료를 체크하면 수취 확인 대기 상태로 전환한다.
    public void confirmSent(Long actorId) {
        if (!fromUser.getId().equals(actorId)) {
            throw new BusinessException(ErrorCode.SETTLEMENT_CONFIRMATION_FORBIDDEN);
        }
        if (status != SettlementStatus.PENDING) {
            throw new BusinessException(ErrorCode.SETTLEMENT_INVALID_STATUS);
        }
        status = SettlementStatus.SENT;
        senderConfirmedAt = LocalDateTime.now();
    }

    // 수취인 본인이 입금을 확인해야 개별 송금이 최종 완료된다.
    public void confirmReceived(Long actorId) {
        if (!toUser.getId().equals(actorId)) {
            throw new BusinessException(ErrorCode.SETTLEMENT_CONFIRMATION_FORBIDDEN);
        }
        if (status != SettlementStatus.SENT) {
            throw new BusinessException(ErrorCode.SETTLEMENT_INVALID_STATUS);
        }
        status = SettlementStatus.COMPLETED;
        receiverConfirmedAt = LocalDateTime.now();
    }

    public boolean isCompleted() {
        return status == SettlementStatus.COMPLETED;
    }
}
