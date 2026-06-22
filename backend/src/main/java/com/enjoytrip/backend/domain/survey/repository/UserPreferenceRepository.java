package com.enjoytrip.backend.domain.survey.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.enjoytrip.backend.domain.survey.entity.UserPreference;

public interface UserPreferenceRepository extends JpaRepository<UserPreference, Long> {
    Optional<UserPreference> findByUserId(Long userId);

    // FR-SURVEY-03: 그룹 멤버들의 성향 벡터를 한 번에 조회한다.
    List<UserPreference> findByUserIdIn(List<Long> userIds);
}
