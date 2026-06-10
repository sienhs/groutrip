package com.enjoytrip.backend.domain.survey.entity;

import com.enjoytrip.backend.global.entity.BaseEntity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
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
@Table(name = "survey_questions")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class SurveyQuestion extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 10)
    private String code;  // A03, F01, etc.

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private SurveyDimension dimension;

    @Column(nullable = false, length = 200)
    private String content;

    @Column(nullable = false)
    private boolean isReverse;  // true면 역문항

    @Column(nullable = false)
    private int displayOrder;

    @Builder
    private SurveyQuestion(String code, SurveyDimension dimension, String content,
                          boolean isReverse, int displayOrder) {
        this.code = code;
        this.dimension = dimension;
        this.content = content;
        this.isReverse = isReverse;
        this.displayOrder = displayOrder;
    }
}
