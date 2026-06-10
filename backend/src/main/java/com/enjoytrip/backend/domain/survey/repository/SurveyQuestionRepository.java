package com.enjoytrip.backend.domain.survey.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

import com.enjoytrip.backend.domain.survey.entity.SurveyQuestion;

public interface SurveyQuestionRepository extends JpaRepository<SurveyQuestion, Long> {
    List<SurveyQuestion> findAllByOrderByDisplayOrderAsc();
}
