package com.enjoytrip.backend.domain.mypage.entity;

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
import jakarta.persistence.UniqueConstraint;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

/**
 * FR-MYPAGE-04: 종료된 그룹에 대한 회고(한 줄 후기 + 별점). 본인만 작성/조회한다.
 * 그룹·사용자당 1건만 존재한다.
 */
@Entity
@Table(name = "retrospectives", uniqueConstraints = {
        @UniqueConstraint(columnNames = {"group_id", "user_id"})
})
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Retrospective extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "group_id", nullable = false)
    private TravelGroup travelGroup;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(nullable = false, length = 200)
    private String content;

    @Column(nullable = false)
    private int rating; // 1~5

    @Builder
    private Retrospective(TravelGroup travelGroup, User user, String content, int rating) {
        this.travelGroup = travelGroup;
        this.user = user;
        this.content = content;
        this.rating = rating;
    }

    // FR-MYPAGE-04: 회고 내용/별점을 수정한다.
    public void update(String content, int rating) {
        this.content = content;
        this.rating = rating;
    }
}
