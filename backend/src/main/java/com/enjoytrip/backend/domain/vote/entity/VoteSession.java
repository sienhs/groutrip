package com.enjoytrip.backend.domain.vote.entity;

import java.time.LocalDateTime;

import com.enjoytrip.backend.domain.auth.entity.User;
import com.enjoytrip.backend.domain.group.entity.TravelGroup;
import com.enjoytrip.backend.domain.schedule.entity.Schedule;
import com.enjoytrip.backend.global.entity.BaseEntity;

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

/**
 * FR-VOTE-01~03: 일정 슬롯 하나에 대한 투표 세션.
 * 세션이 열리면 대상 일정은 VOTING 상태가 되고, 마감 시 당선 후보 장소가 일정으로 승격된다.
 */
@Entity
@Table(name = "vote_sessions")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class VoteSession extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "group_id", nullable = false)
    private TravelGroup travelGroup;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "schedule_id", nullable = false)
    private Schedule schedule;

    @Column(length = 100)
    private String title;

    // 선택적 마감 시각(FR-VOTE-03). 자동 마감 배치는 후속 작업이며 현재는 수동 마감 기준이다.
    private LocalDateTime closesAt;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private VoteStatus status;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "created_by", nullable = false)
    private User createdBy;

    // 마감 시 당선된 후보 id(이력 표시용).
    private Long winnerCandidateId;

    @Builder
    private VoteSession(TravelGroup travelGroup, Schedule schedule, String title,
                        LocalDateTime closesAt, User createdBy) {
        this.travelGroup = travelGroup;
        this.schedule = schedule;
        this.title = title;
        this.closesAt = closesAt;
        this.createdBy = createdBy;
        this.status = VoteStatus.OPEN;
    }

    public boolean isOpen() {
        return this.status == VoteStatus.OPEN;
    }

    // FR-VOTE-03: 당선 후보를 확정하고 세션을 마감한다.
    public void close(Long winnerCandidateId) {
        this.winnerCandidateId = winnerCandidateId;
        this.status = VoteStatus.CLOSED;
    }
}
