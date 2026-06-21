package com.enjoytrip.backend.domain.expense.entity;

import java.time.LocalDate;
import java.time.LocalDateTime;

import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import com.enjoytrip.backend.domain.auth.entity.User;
import com.enjoytrip.backend.domain.group.entity.TravelGroup;

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
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "expenses")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@EntityListeners(AuditingEntityListener.class)
public class Expense {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "group_id", nullable = false)
    private TravelGroup travelGroup;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "payer_id", nullable = false)
    private User payer;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "created_by", nullable = false)
    private User createdBy;

    @Column(nullable = false)
    private Long amount;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private ExpenseCategory category;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private SplitType splitType;

    @Column(length = 255)
    private String description;

    @Column(nullable = false)
    private LocalDate paidAt;

    // FR-EXPENSE-07: 일정 이동비에서 생성된 지출이면 원본 일정 id만 느슨하게 보관한다.
    private Long sourceScheduleId;

    private LocalDateTime deletedAt;

    @CreatedDate
    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @LastModifiedDate
    @Column(nullable = false)
    private LocalDateTime updatedAt;

    @Builder
    private Expense(
            TravelGroup travelGroup,
            User payer,
            User createdBy,
            Long amount,
            ExpenseCategory category,
            SplitType splitType,
            String description,
            LocalDate paidAt,
            Long sourceScheduleId
    ) {
        this.travelGroup = travelGroup;
        this.payer = payer;
        this.createdBy = createdBy;
        this.amount = amount;
        this.category = category;
        this.splitType = splitType;
        this.description = description;
        this.paidAt = paidAt;
        this.sourceScheduleId = sourceScheduleId;
    }

    // FR-EXPENSE-03: 작성자 또는 Owner가 지출 기본 정보를 수정할 때 사용한다.
    public void update(
            User payer,
            Long amount,
            ExpenseCategory category,
            SplitType splitType,
            String description,
            LocalDate paidAt,
            Long sourceScheduleId
    ) {
        this.payer = payer;
        this.amount = amount;
        this.category = category;
        this.splitType = splitType;
        this.description = description;
        this.paidAt = paidAt;
        this.sourceScheduleId = sourceScheduleId;
    }

    // FR-EXPENSE-03: 지출 삭제는 정산 이력 보존을 위해 hard delete 대신 삭제 시각만 기록한다.
    public void softDelete() {
        this.deletedAt = LocalDateTime.now();
    }
}
