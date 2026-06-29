package com.enjoytrip.backend.domain.group.entity;

import java.time.LocalDate;
import java.time.LocalDateTime;

import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EntityListeners;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "groups")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@EntityListeners(AuditingEntityListener.class)
public class TravelGroup {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 30)
    private String title;

    @Column(nullable = false, length = 100)
    private String destination;

    @Column(nullable = false)
    private LocalDate startDate;

    @Column(nullable = false)
    private LocalDate endDate;

    @Column(length = 255)
    private String coverImageKey;

    // coverImageKey == "CUSTOM"이면 사용하는 커스텀 커버 이미지의 S3 object key.
    // (coverImageKey는 프리셋 식별자/'CUSTOM', coverObjectKey는 실제 저장 객체 key로 역할이 다르다.)
    @Column(name = "cover_object_key", length = 255)
    private String coverObjectKey;

    @Column(name = "cover_image_content_type", length = 100)
    private String coverImageContentType;

    @Column(nullable = false, unique = true, length = 6)
    private String inviteCode;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private GroupStatus status;

    // 채팅 허브 상단 고정 공지. type은 "POST"(게시판 공지글) 또는 "VOTE"(진행중 투표), 미고정이면 null.
    @Column(name = "pinned_type", length = 10)
    private String pinnedType;

    @Column(name = "pinned_ref_id")
    private Long pinnedRefId;

    @Column(name = "pinned_title", length = 200)
    private String pinnedTitle;

    private LocalDateTime deletedAt;

    @CreatedDate
    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @LastModifiedDate
    @Column(nullable = false)
    private LocalDateTime updatedAt;

    @Builder
    private TravelGroup(
            String title,
            String destination,
            LocalDate startDate,
            LocalDate endDate,
            String coverImageKey,
            String inviteCode,
            GroupStatus status
    ) {
        this.title = title;
        this.destination = destination;
        this.startDate = startDate;
        this.endDate = endDate;
        this.coverImageKey = coverImageKey;
        this.inviteCode = inviteCode;
        this.status = status;
    }

    // FR-GROUP-04: Owner가 그룹 기본 정보를 수정할 때 사용하는 도메인 메서드이다.
    public void updateInfo(String title, String destination, LocalDate startDate, LocalDate endDate, String coverImageKey) {
        this.title = title;
        this.destination = destination;
        this.startDate = startDate;
        this.endDate = endDate;
        this.coverImageKey = coverImageKey;
    }

    // 커스텀 커버 이미지 설정. coverImageKey를 'CUSTOM'으로 바꿔 프리셋과 구분한다.
    public void setCustomCover(String objectKey, String contentType) {
        this.coverObjectKey = objectKey;
        this.coverImageContentType = contentType;
        this.coverImageKey = "CUSTOM";
    }

    public boolean hasCustomCover() {
        return coverObjectKey != null && !coverObjectKey.isBlank();
    }

    // 그룹 상태는 조회 시점마다 계산하지 않고 배치에서 날짜 기준으로 갱신한다.
    public void updateStatus(LocalDate today) {
        if (this.status == GroupStatus.DELETED) {
            return;
        }
        this.status = GroupStatus.fromDates(this.startDate, this.endDate, today);
    }

    // FR-GROUP-07: 새 초대코드를 저장하면 기존 초대코드는 즉시 더 이상 조회되지 않는다.
    public void regenerateInviteCode(String inviteCode) {
        this.inviteCode = inviteCode;
    }

    // 채팅 허브 상단 고정 공지를 설정한다(방장 전용). type="POST"|"VOTE".
    public void pinNotice(String type, Long refId, String title) {
        this.pinnedType = type;
        this.pinnedRefId = refId;
        this.pinnedTitle = title;
    }

    // 상단 고정 공지를 해제한다.
    public void clearPinnedNotice() {
        this.pinnedType = null;
        this.pinnedRefId = null;
        this.pinnedTitle = null;
    }

    // FR-GROUP-06: 그룹 해체는 즉시 hard delete하지 않고 삭제 상태와 삭제 시각만 기록한다.
    public void softDelete() {
        this.status = GroupStatus.DELETED;
        this.deletedAt = LocalDateTime.now();
    }
}
