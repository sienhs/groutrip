package com.enjoytrip.backend.domain.survey.controller;

import java.util.List;

import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.enjoytrip.backend.domain.survey.dto.SurveyQuestionResponse;
import com.enjoytrip.backend.domain.survey.dto.SurveySubmitRequest;
import com.enjoytrip.backend.domain.survey.dto.UserPreferenceResponse;
import com.enjoytrip.backend.domain.survey.service.SurveyService;
import com.enjoytrip.backend.global.response.ApiResponse;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/surveys")
@RequiredArgsConstructor
public class SurveyController {

    private final SurveyService surveyService;

    @GetMapping("/questions")
    public ResponseEntity<ApiResponse<List<SurveyQuestionResponse>>> getQuestions() {
        return ResponseEntity.ok(
                ApiResponse.success("설문 문항 조회 성공", surveyService.getQuestions())
        );
    }

    @PostMapping("/submit")
    public ResponseEntity<ApiResponse<UserPreferenceResponse>> submit(
            @AuthenticationPrincipal UserDetails userDetails,
            @RequestBody @Valid SurveySubmitRequest request) {
        UserPreferenceResponse response = surveyService.submit(userDetails.getUsername(), request);
        return ResponseEntity.ok(ApiResponse.success("설문 응답 저장 성공", response));
    }

    @GetMapping("/me")
    public ResponseEntity<ApiResponse<UserPreferenceResponse>> getMine(
            @AuthenticationPrincipal UserDetails userDetails) {
        UserPreferenceResponse response = surveyService.getMyPreference(userDetails.getUsername());
        return ResponseEntity.ok(ApiResponse.success("내 성향 조회 성공", response));
    }
}
