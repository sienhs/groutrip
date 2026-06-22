package com.enjoytrip.backend.domain.mypage.dto;

import com.enjoytrip.backend.domain.survey.dto.UserPreferenceResponse;

/**
 * FR-MYPAGE-01: 마이페이지 프로필. 이름/이메일과 성향 벡터(미응답 시 null)를 제공한다.
 * 참여 그룹 목록은 홈 대시보드(/api/home)와 동일한 집계를 사용한다.
 */
public record MyPageResponse(
        String name,
        String email,
        UserPreferenceResponse preference
) {
}
