package com.enjoytrip.backend.domain.vote.entity;

import com.enjoytrip.backend.domain.auth.entity.User;
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
 * FR-VOTE-02: 후보별 멤버 점수(1~5, 실명). 한 멤버는 후보당 1건만 가지며 재투표 시 점수만 갱신한다.
 */
@Entity
@Table(name = "votes", uniqueConstraints = {
        @UniqueConstraint(columnNames = {"candidate_id", "voter_id"})
})
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Vote extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "candidate_id", nullable = false)
    private VoteCandidate candidate;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "voter_id", nullable = false)
    private User voter;

    @Column(nullable = false)
    private int score; // 1~5

    @Builder
    private Vote(VoteCandidate candidate, User voter, int score) {
        this.candidate = candidate;
        this.voter = voter;
        this.score = score;
    }

    // FR-VOTE-02: 재투표 시 점수만 갱신(이력 보관 안 함).
    public void updateScore(int score) {
        this.score = score;
    }
}
