package com.enjoytrip.backend.domain.survey.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import java.util.List;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import com.enjoytrip.backend.domain.auth.entity.User;
import com.enjoytrip.backend.domain.group.entity.GroupMember;
import com.enjoytrip.backend.domain.group.entity.GroupRole;
import com.enjoytrip.backend.domain.group.entity.GroupStatus;
import com.enjoytrip.backend.domain.group.entity.TravelGroup;
import com.enjoytrip.backend.domain.group.repository.GroupMemberRepository;
import com.enjoytrip.backend.domain.group.service.CurrentUserResolver;
import com.enjoytrip.backend.domain.group.service.GroupAccessValidator;
import com.enjoytrip.backend.domain.survey.dto.GroupPersonaResponse;
import com.enjoytrip.backend.domain.survey.entity.UserPreference;
import com.enjoytrip.backend.domain.survey.repository.UserPreferenceRepository;

import java.time.LocalDate;

class GroupPersonaServiceTest {

    private GroupMemberRepository groupMemberRepository;
    private UserPreferenceRepository userPreferenceRepository;
    private CurrentUserResolver currentUserResolver;
    private GroupAccessValidator groupAccessValidator;
    private GroupPersonaService groupPersonaService;

    @BeforeEach
    void setUp() {
        groupMemberRepository = mock(GroupMemberRepository.class);
        userPreferenceRepository = mock(UserPreferenceRepository.class);
        currentUserResolver = mock(CurrentUserResolver.class);
        groupAccessValidator = mock(GroupAccessValidator.class);
        groupPersonaService = new GroupPersonaService(
                groupMemberRepository, userPreferenceRepository, currentUserResolver, groupAccessValidator);
    }

    @Test
    void computesAverageMatchRateAndPicksHighestVarianceDimension() {
        TravelGroup group = group();
        User a = user(1L);
        User b = user(2L);
        when(currentUserResolver.getCurrentUser()).thenReturn(a);
        when(groupMemberRepository.findByTravelGroupIdAndLeftAtIsNull(1L))
                .thenReturn(List.of(member(group, a), member(group, b)));
        // pace만 0.1 vs 0.9로 크게 갈리고 나머지는 동일 → 충돌 차원 = PACE
        when(userPreferenceRepository.findByUserIdIn(anyList())).thenReturn(List.of(
                pref(a, 0.8, 0.5, 0.1, 0.5, 0.5),
                pref(b, 0.8, 0.5, 0.9, 0.5, 0.5)));

        GroupPersonaResponse response = groupPersonaService.getGroupPersona(1L);

        assertThat(response.memberCount()).isEqualTo(2);
        assertThat(response.respondedCount()).isEqualTo(2);
        assertThat(response.average().pace()).isEqualTo(0.5); // (0.1 + 0.9) / 2
        assertThat(response.average().activity()).isEqualTo(0.8);
        assertThat(response.matchRate()).isBetween(0, 100);
        assertThat(response.mostConflictingDimension()).isEqualTo("PACE");
        assertThat(response.conflictMessage()).contains("여행 페이스");
    }

    @Test
    void returnsAverageOnlyWhenSingleResponder() {
        TravelGroup group = group();
        User a = user(1L);
        User b = user(2L);
        when(currentUserResolver.getCurrentUser()).thenReturn(a);
        when(groupMemberRepository.findByTravelGroupIdAndLeftAtIsNull(1L))
                .thenReturn(List.of(member(group, a), member(group, b)));
        when(userPreferenceRepository.findByUserIdIn(anyList()))
                .thenReturn(List.of(pref(a, 0.7, 0.6, 0.5, 0.4, 0.3)));

        GroupPersonaResponse response = groupPersonaService.getGroupPersona(1L);

        assertThat(response.memberCount()).isEqualTo(2);
        assertThat(response.respondedCount()).isEqualTo(1);
        assertThat(response.average().activity()).isEqualTo(0.7);
        assertThat(response.matchRate()).isNull(); // 1명이면 유사도 계산 불가
        assertThat(response.mostConflictingDimension()).isNull();
    }

    @Test
    void returnsEmptyPersonaWhenNobodyResponded() {
        TravelGroup group = group();
        User a = user(1L);
        when(currentUserResolver.getCurrentUser()).thenReturn(a);
        when(groupMemberRepository.findByTravelGroupIdAndLeftAtIsNull(1L))
                .thenReturn(List.of(member(group, a)));
        when(userPreferenceRepository.findByUserIdIn(anyList())).thenReturn(List.of());

        GroupPersonaResponse response = groupPersonaService.getGroupPersona(1L);

        assertThat(response.memberCount()).isEqualTo(1);
        assertThat(response.respondedCount()).isEqualTo(0);
        assertThat(response.average()).isNull();
        assertThat(response.matchRate()).isNull();
        assertThat(response.conflictMessage()).isNull();
    }

    @Test
    void identicalVectorsGiveFullMatchRate() {
        TravelGroup group = group();
        User a = user(1L);
        User b = user(2L);
        when(currentUserResolver.getCurrentUser()).thenReturn(a);
        when(groupMemberRepository.findByTravelGroupIdAndLeftAtIsNull(1L))
                .thenReturn(List.of(member(group, a), member(group, b)));
        when(userPreferenceRepository.findByUserIdIn(anyList())).thenReturn(List.of(
                pref(a, 0.6, 0.6, 0.6, 0.6, 0.6),
                pref(b, 0.6, 0.6, 0.6, 0.6, 0.6)));

        GroupPersonaResponse response = groupPersonaService.getGroupPersona(1L);

        assertThat(response.matchRate()).isEqualTo(100); // 동일 벡터 → 코사인 1.0
    }

    // --- helpers ---

    private TravelGroup group() {
        TravelGroup group = TravelGroup.builder()
                .title("Trip").destination("Seoul")
                .startDate(LocalDate.of(2026, 7, 1))
                .endDate(LocalDate.of(2026, 7, 3))
                .inviteCode("ABC123").status(GroupStatus.PLANNING)
                .build();
        ReflectionTestUtils.setField(group, "id", 1L);
        return group;
    }

    private User user(Long id) {
        User user = User.builder().email("u" + id + "@test.com").password("encoded").name("user" + id).build();
        ReflectionTestUtils.setField(user, "id", id);
        return user;
    }

    private GroupMember member(TravelGroup group, User user) {
        GroupMember member = GroupMember.builder()
                .travelGroup(group).user(user).role(GroupRole.MEMBER).build();
        ReflectionTestUtils.setField(member, "id", user.getId());
        return member;
    }

    private UserPreference pref(User user, double activity, double food, double pace,
                                double urbanNature, double timePref) {
        return UserPreference.builder()
                .user(user)
                .activity(activity).food(food).pace(pace).urbanNature(urbanNature).timePref(timePref)
                .build();
    }
}
