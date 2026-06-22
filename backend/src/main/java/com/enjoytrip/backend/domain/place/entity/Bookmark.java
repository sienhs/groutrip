package com.enjoytrip.backend.domain.place.entity;

import com.enjoytrip.backend.domain.auth.entity.User;
import com.enjoytrip.backend.domain.group.entity.TravelGroup;
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
import jakarta.persistence.UniqueConstraint;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

/**
 * FR-PLACE-02: 그룹 보관함 항목.
 * 그룹 ↔ 장소 매핑에 메모/카테고리 태그/개인 별점을 더한 단위이며,
 * 같은 그룹에서 동일 장소(Google placeId 기준)는 한 번만 등록된다(unique 제약).
 */
@Entity
@Table(name = "bookmarks", uniqueConstraints = {
        @UniqueConstraint(columnNames = {"group_id", "place_id"})
})
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Bookmark extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "group_id", nullable = false)
    private TravelGroup travelGroup;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "place_id", nullable = false)
    private Place place;

    // FR-PLACE-02: 추가자 기록. 본인 또는 Owner만 수정/삭제할 수 있다(FR-PLACE-04).
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "created_by", nullable = false)
    private User createdBy;

    // 추가자가 선택한 카테고리 태그(검색 결과의 카테고리 기본값에서 변경 가능).
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private PlaceCategory categoryTag;

    @Column(length = 500)
    private String memo;

    private Integer personalRating; // 1~5, 선택값

    @Builder
    private Bookmark(TravelGroup travelGroup, Place place, User createdBy,
                     PlaceCategory categoryTag, String memo, Integer personalRating) {
        this.travelGroup = travelGroup;
        this.place = place;
        this.createdBy = createdBy;
        this.categoryTag = categoryTag;
        this.memo = memo;
        this.personalRating = personalRating;
    }

    // FR-PLACE-04: 추가자 본인 또는 Owner가 보관함 항목을 수정한다.
    public void update(PlaceCategory categoryTag, String memo, Integer personalRating) {
        this.categoryTag = categoryTag;
        this.memo = memo;
        this.personalRating = personalRating;
    }

    // FR-PLACE-04: 추가자 본인 또는 Owner인지 검증한다.
    public boolean isOwnedBy(Long userId) {
        return createdBy.getId().equals(userId);
    }
}
