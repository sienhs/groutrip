package com.enjoytrip.backend.domain.gallery.entity;

import com.enjoytrip.backend.domain.auth.entity.User;
import com.enjoytrip.backend.domain.group.entity.TravelGroup;
import com.enjoytrip.backend.global.entity.BaseEntity;

import jakarta.persistence.Basic;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
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
 * 그룹 사진 갤러리 항목. 이미지는 MinIO 미가동 환경이라 우선 DB(bytea)에 저장한다.
 */
@Entity
@Table(name = "group_photos")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class GroupPhoto extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "group_id", nullable = false)
    private TravelGroup travelGroup;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "uploaded_by", nullable = false)
    private User uploadedBy;

    @Column(name = "content_type", nullable = false, length = 100)
    private String contentType;

    // 목록/단건 조회 시 불필요한 blob 로딩을 피하려고 LAZY. 이미지 엔드포인트에서만 접근.
    @Basic(fetch = FetchType.LAZY)
    @Column(nullable = false)
    private byte[] data;

    @Builder
    private GroupPhoto(TravelGroup travelGroup, User uploadedBy, String contentType, byte[] data) {
        this.travelGroup = travelGroup;
        this.uploadedBy = uploadedBy;
        this.contentType = contentType;
        this.data = data;
    }

    public boolean isUploadedBy(Long userId) {
        return uploadedBy.getId().equals(userId);
    }
}
