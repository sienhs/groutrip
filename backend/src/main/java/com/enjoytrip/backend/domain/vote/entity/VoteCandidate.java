package com.enjoytrip.backend.domain.vote.entity;

import com.enjoytrip.backend.domain.auth.entity.User;
import com.enjoytrip.backend.domain.place.entity.Place;
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
 * FR-VOTE-01: 투표 후보(장소). 멤버가 세션당 1~5개까지 등록한다.
 */
@Entity
@Table(name = "vote_candidates")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class VoteCandidate extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "vote_session_id", nullable = false)
    private VoteSession voteSession;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "place_id", nullable = false)
    private Place place;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "registered_by", nullable = false)
    private User registeredBy;

    @Column(length = 500)
    private String memo;

    @Builder
    private VoteCandidate(VoteSession voteSession, Place place, User registeredBy, String memo) {
        this.voteSession = voteSession;
        this.place = place;
        this.registeredBy = registeredBy;
        this.memo = memo;
    }
}
