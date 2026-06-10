package com.enjoytrip.backend.domain.survey.entity;

import com.enjoytrip.backend.domain.auth.entity.User;
import com.enjoytrip.backend.global.entity.BaseEntity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.OneToOne;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "user_preferences")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class UserPreference extends BaseEntity {

    @Id
    private Long userId;  // User PK 공유

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id")
    @org.hibernate.annotations.OnDelete(action = org.hibernate.annotations.OnDeleteAction.CASCADE)
    private User user;

    @Column(nullable = false)
    private double activity;       // 0.0 ~ 1.0

    @Column(nullable = false)
    private double food;

    @Column(nullable = false)
    private double pace;

    @Column(nullable = false)
    private double urbanNature;

    @Column(nullable = false)
    private double timePref;

    @Builder
    private UserPreference(User user, double activity, double food,
                          double pace, double urbanNature, double timePref) {
        this.user = user;
        this.userId = user.getId();
        this.activity = activity;
        this.food = food;
        this.pace = pace;
        this.urbanNature = urbanNature;
        this.timePref = timePref;
    }

    public void update(double activity, double food, double pace,
                       double urbanNature, double timePref) {
        this.activity = activity;
        this.food = food;
        this.pace = pace;
        this.urbanNature = urbanNature;
        this.timePref = timePref;
    }
}
