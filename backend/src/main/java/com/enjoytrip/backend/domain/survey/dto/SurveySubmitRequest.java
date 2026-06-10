package com.enjoytrip.backend.domain.survey.dto;

import java.util.List;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;

@Getter
public class SurveySubmitRequest {

    @NotEmpty(message = "응답이 비어있습니다.")
    @Valid
    private List<Answer> answers;

    @Getter
    public static class Answer {
        @NotNull
        private Long questionId;

        @Min(1) @Max(5)
        private int score;
    }
}
