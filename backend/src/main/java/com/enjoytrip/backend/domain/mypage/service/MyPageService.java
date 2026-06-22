package com.enjoytrip.backend.domain.mypage.service;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.enjoytrip.backend.domain.auth.entity.User;
import com.enjoytrip.backend.domain.group.service.CurrentUserResolver;
import com.enjoytrip.backend.domain.mypage.dto.MyPageResponse;
import com.enjoytrip.backend.domain.survey.dto.UserPreferenceResponse;
import com.enjoytrip.backend.domain.survey.repository.UserPreferenceRepository;

import lombok.RequiredArgsConstructor;

/**
 * FR-MYPAGE-01: 마이페이지 프로필(이름/이메일/성향).
 */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class MyPageService {

    private final CurrentUserResolver currentUserResolver;
    private final UserPreferenceRepository userPreferenceRepository;

    public MyPageResponse getMyPage() {
        User user = currentUserResolver.getCurrentUser();
        UserPreferenceResponse preference = userPreferenceRepository.findByUserId(user.getId())
                .map(UserPreferenceResponse::from)
                .orElse(null);
        return new MyPageResponse(user.getName(), user.getEmail(), preference);
    }
}
