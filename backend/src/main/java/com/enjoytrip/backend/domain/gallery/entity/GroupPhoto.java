package com.enjoytrip.backend.domain.gallery.entity;

import com.enjoytrip.backend.domain.auth.entity.User;
import com.enjoytrip.backend.domain.group.entity.TravelGroup;
import com.enjoytrip.backend.global.entity.BaseEntity;

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
 * 그룹 사진 갤러리 항목. 이미지 바이트는 S3에 저장하고 엔티티에는 object key만 보관한다.
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

    // 이미지 바이트의 S3 object key. 바이트는 이미지 엔드포인트에서 key로 조회한다.
    @Column(name = "object_key", nullable = false, length = 255)
    private String objectKey;

    @Builder
    private GroupPhoto(TravelGroup travelGroup, User uploadedBy, String contentType, String objectKey) {
        this.travelGroup = travelGroup;
        this.uploadedBy = uploadedBy;
        this.contentType = contentType;
        this.objectKey = objectKey;
    }

    public boolean isUploadedBy(Long userId) {
        return uploadedBy.getId().equals(userId);
    }
}
