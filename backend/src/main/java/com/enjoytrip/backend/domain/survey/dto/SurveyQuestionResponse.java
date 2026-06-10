package com.enjoytrip.backend.domain.survey.dto;

import com.enjoytrip.backend.domain.survey.entity.SurveyDimension;
import com.enjoytrip.backend.domain.survey.entity.SurveyQuestion;

import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class SurveyQuestionResponse {
    private Long id;
    private String code;
    private SurveyDimension dimension;
    private String content;
    private boolean isReverse;
    private int displayOrder;

    public static SurveyQuestionResponse from(SurveyQuestion q) {
        return SurveyQuestionResponse.builder()
                .id(q.getId())
                .code(q.getCode())
                .dimension(q.getDimension())
                .content(q.getContent())
                .isReverse(q.isReverse())
                .displayOrder(q.getDisplayOrder())
                .build();
    }
}
