package com.enjoytrip.backend.domain.schedule.entity;

import java.time.LocalDate;
import java.time.LocalTime;

import com.enjoytrip.backend.domain.auth.entity.User;
import com.enjoytrip.backend.domain.group.entity.TravelGroup;
import com.enjoytrip.backend.domain.place.entity.Place;
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
 * FR-SCHEDULE: 그룹 일자별 일정 항목.
 * 같은 그룹+일자 안에서 orderIndex 순서로 정렬되며, 드래그로 일자(scheduleDate)/순서(orderIndex)를 변경한다.
 * 협업 우선이라 모든 그룹 멤버가 수정/삭제할 수 있고, 마지막 수정자(updatedBy)를 기록한다.
 */
@Entity
@Table(name = "schedules")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Schedule extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "group_id", nullable = false)
    private TravelGroup travelGroup;

    // 빈 일정(투표로 장소를 정할 일정)은 place가 null이며 title로 식별한다.
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "place_id")
    private Place place;

    // 빈 일정의 사용자 입력 제목(장소가 정해지기 전 식별용). 장소 기반 일정에선 선택값.
    @Column(length = 100)
    private String title;

    // 방문 일자. 그룹 여행 기간(start~end) 안이어야 한다.
    @Column(nullable = false)
    private LocalDate scheduleDate;

    // 같은 일자 내 정렬 순서. 드래그 reorder 시 재계산된다.
    @Column(nullable = false)
    private int orderIndex;

    @Column(nullable = false)
    private LocalTime startTime;

    @Column(nullable = false)
    private LocalTime endTime;

    @Column(length = 500)
    private String memo;

    private Long estimatedCost; // 예상 비용(원), 선택

    // FR-SCHEDULE-04: 다음 장소로의 이동 수단(사용자 선택). 비용 계산/정산 연동의 기준.
    @Enumerated(EnumType.STRING)
    @Column(length = 20)
    private TransportMode transportMode;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private ScheduleStatus status;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "created_by", nullable = false)
    private User createdBy;

    // FR-SCHEDULE-02: 마지막 수정자.
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "updated_by", nullable = false)
    private User updatedBy;

    @Builder
    private Schedule(TravelGroup travelGroup, Place place, String title, LocalDate scheduleDate, int orderIndex,
                     LocalTime startTime, LocalTime endTime, String memo, Long estimatedCost,
                     TransportMode transportMode, ScheduleStatus status, User createdBy, User updatedBy) {
        this.travelGroup = travelGroup;
        this.place = place;
        this.title = title;
        this.scheduleDate = scheduleDate;
        this.orderIndex = orderIndex;
        this.startTime = startTime;
        this.endTime = endTime;
        this.memo = memo;
        this.estimatedCost = estimatedCost;
        this.transportMode = transportMode;
        this.status = status == null ? ScheduleStatus.PLANNED : status;
        this.createdBy = createdBy;
        this.updatedBy = updatedBy;
    }

    // FR-SCHEDULE-02: 시간/메모/예상비용/이동수단/상태를 수정하고 마지막 수정자를 갱신한다.
    public void update(LocalTime startTime, LocalTime endTime, String memo, Long estimatedCost,
                       TransportMode transportMode, ScheduleStatus status, User editor) {
        this.startTime = startTime;
        this.endTime = endTime;
        this.memo = memo;
        this.estimatedCost = estimatedCost;
        this.transportMode = transportMode;
        if (status != null) {
            this.status = status;
        }
        this.updatedBy = editor;
    }

    // 예상 비용만 단독으로 갱신한다(정산 연동 지출 등록 플로우에서 사용).
    public void updateEstimatedCost(Long estimatedCost, User editor) {
        this.estimatedCost = estimatedCost;
        this.updatedBy = editor;
    }

    // FR-SCHEDULE-03: 드래그로 일자/순서를 변경한다.
    public void moveTo(LocalDate scheduleDate, int orderIndex, User editor) {
        this.scheduleDate = scheduleDate;
        this.orderIndex = orderIndex;
        this.updatedBy = editor;
    }

    // FR-VOTE-01: 후보 투표가 시작되면 슬롯을 VOTING 상태로 전환한다.
    public void markVoting(User editor) {
        this.status = ScheduleStatus.VOTING;
        this.updatedBy = editor;
    }

    // FR-VOTE-03: 투표 마감/채택 시 당선 후보 장소로 승격하고 PLANNED로 되돌린다.
    public void adoptPlace(Place place, User editor) {
        this.place = place;
        this.status = ScheduleStatus.PLANNED;
        this.updatedBy = editor;
    }
}
