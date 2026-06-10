package com.enjoytrip.backend.domain.survey.service;

import java.util.EnumMap;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.enjoytrip.backend.domain.auth.entity.User;
import com.enjoytrip.backend.domain.auth.repository.UserRepository;
import com.enjoytrip.backend.domain.survey.dto.SurveyQuestionResponse;
import com.enjoytrip.backend.domain.survey.dto.SurveySubmitRequest;
import com.enjoytrip.backend.domain.survey.dto.UserPreferenceResponse;
import com.enjoytrip.backend.domain.survey.entity.SurveyDimension;
import com.enjoytrip.backend.domain.survey.entity.SurveyQuestion;
import com.enjoytrip.backend.domain.survey.entity.UserPreference;
import com.enjoytrip.backend.domain.survey.repository.SurveyQuestionRepository;
import com.enjoytrip.backend.domain.survey.repository.UserPreferenceRepository;
import com.enjoytrip.backend.global.exception.BusinessException;
import com.enjoytrip.backend.global.exception.ErrorCode;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class SurveyService {

    private final SurveyQuestionRepository questionRepository;
    private final UserPreferenceRepository preferenceRepository;
    private final UserRepository userRepository;

    @Transactional(readOnly = true)
    public List<SurveyQuestionResponse> getQuestions() {
        return questionRepository.findAllByOrderByDisplayOrderAsc().stream()
                .map(SurveyQuestionResponse::from)
                .toList();
    }

    @Transactional
    public UserPreferenceResponse submit(String email, SurveySubmitRequest request) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new BusinessException(ErrorCode.USER_NOT_FOUND));

        // 모든 질문 가져와서 응답 매칭
        List<SurveyQuestion> questions = questionRepository.findAll();
        Map<Long, SurveyQuestion> questionMap = new HashMap<>();
        questions.forEach(q -> questionMap.put(q.getId(), q));

        // 모든 문항 응답 필수
        if (request.getAnswers().size() != questions.size()) {
            throw new BusinessException(ErrorCode.SURVEY_INCOMPLETE);
        }

        // 차원별 점수 합산
        Map<SurveyDimension, Double> sumByDim = new EnumMap<>(SurveyDimension.class);
        Map<SurveyDimension, Integer> countByDim = new EnumMap<>(SurveyDimension.class);

        for (SurveySubmitRequest.Answer answer : request.getAnswers()) {
            SurveyQuestion q = questionMap.get(answer.getQuestionId());
            if (q == null) {
                throw new BusinessException(ErrorCode.SURVEY_QUESTION_NOT_FOUND);
            }
            double normalized = q.isReverse()
                    ? (5.0 - answer.getScore()) / 4.0
                    : (answer.getScore() - 1) / 4.0;

            sumByDim.merge(q.getDimension(), normalized, Double::sum);
            countByDim.merge(q.getDimension(), 1, Integer::sum);
        }

        double activity = avg(sumByDim, countByDim, SurveyDimension.ACTIVITY);
        double food = avg(sumByDim, countByDim, SurveyDimension.FOOD);
        double pace = avg(sumByDim, countByDim, SurveyDimension.PACE);
        double urbanNature = avg(sumByDim, countByDim, SurveyDimension.URBAN_NATURE);
        double timePref = avg(sumByDim, countByDim, SurveyDimension.TIME_PREF);

        UserPreference preference = preferenceRepository.findByUserId(user.getId())
                .orElseGet(() -> UserPreference.builder()
                        .user(user)
                        .activity(activity).food(food).pace(pace)
                        .urbanNature(urbanNature).timePref(timePref)
                        .build());

        preference.update(activity, food, pace, urbanNature, timePref);
        preferenceRepository.save(preference);

        return UserPreferenceResponse.from(preference);
    }

    @Transactional(readOnly = true)
    public UserPreferenceResponse getMyPreference(String email) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new BusinessException(ErrorCode.USER_NOT_FOUND));

        UserPreference preference = preferenceRepository.findByUserId(user.getId())
                .orElseThrow(() -> new BusinessException(ErrorCode.NOT_FOUND));

        return UserPreferenceResponse.from(preference);
    }

    private double avg(Map<SurveyDimension, Double> sum,
                       Map<SurveyDimension, Integer> count,
                       SurveyDimension dim) {
        Double s = sum.get(dim);
        Integer c = count.get(dim);
        if (s == null || c == null || c == 0) return 0.5;  // 기본값 중립
        return s / c;
    }
}
