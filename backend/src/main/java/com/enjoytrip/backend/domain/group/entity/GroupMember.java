package com.enjoytrip.backend.domain.group.entity;

import java.time.LocalDateTime;

import com.enjoytrip.backend.domain.auth.entity.User;

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
import jakarta.persistence.UniqueConstraint;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "group_members", uniqueConstraints = {
        @UniqueConstraint(columnNames = {"group_id", "user_id"})
})
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class GroupMember {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "group_id", nullable = false)
    private TravelGroup travelGroup;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private GroupRole role;

    @Column(nullable = false, updatable = false)
    private LocalDateTime joinedAt;

    private LocalDateTime leftAt;

    @Builder
    private GroupMember(TravelGroup travelGroup, User user, GroupRole role) {
        this.travelGroup = travelGroup;
        this.user = user;
        this.role = role;
        this.joinedAt = LocalDateTime.now();
    }

    // 그룹 Owner 전용 기능인지 판별할 때 사용하는 역할 검사 메서드이다.
    public boolean isOwner() {
        return role == GroupRole.OWNER;
    }

    // FR-GROUP-05: Owner 이전 대상 멤버를 새 Owner로 승격한다.
    public void transferOwner() {
        this.role = GroupRole.OWNER;
    }

    // FR-GROUP-05: 기존 Owner를 일반 멤버로 내릴 때 사용한다.
    public void becomeMember() {
        this.role = GroupRole.MEMBER;
    }

    // FR-GROUP-05: 멤버 탈퇴/강퇴는 기록 보존을 위해 leftAt만 채우는 soft leave 방식이다.
    public void leave() {
        if (this.leftAt != null) {
            return;
        }
        this.leftAt = LocalDateTime.now();
    }

    // leftAt이 없으면 현재 그룹에서 활동 중인 멤버로 본다.
    public boolean isActive() {
        return this.leftAt == null;
    }

    // FR-GROUP-03: 떠났던/강퇴된 멤버가 초대코드로 재참여할 때 기존 행을 재활성화한다.
    // (group_id, user_id) unique 제약 때문에 새 행 INSERT 대신 이 메서드로 되살린다.
    public void rejoinAsMember() {
        this.leftAt = null;
        this.role = GroupRole.MEMBER;
    }
}
