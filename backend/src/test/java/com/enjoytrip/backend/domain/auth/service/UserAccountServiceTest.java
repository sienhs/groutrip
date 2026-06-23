package com.enjoytrip.backend.domain.auth.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import com.enjoytrip.backend.domain.auth.entity.User;
import com.enjoytrip.backend.domain.auth.repository.RefreshTokenRepository;
import com.enjoytrip.backend.domain.auth.repository.UserRepository;
import com.enjoytrip.backend.domain.group.entity.GroupMember;
import com.enjoytrip.backend.domain.group.entity.GroupRole;
import com.enjoytrip.backend.domain.group.entity.GroupStatus;
import com.enjoytrip.backend.domain.group.entity.TravelGroup;
import com.enjoytrip.backend.domain.group.repository.GroupMemberRepository;
import com.enjoytrip.backend.global.exception.BusinessException;
import com.enjoytrip.backend.global.exception.ErrorCode;

class UserAccountServiceTest {

    private UserRepository userRepository;
    private RefreshTokenRepository refreshTokenRepository;
    private GroupMemberRepository groupMemberRepository;
    private UserAccountService userAccountService;

    @BeforeEach
    void setUp() {
        userRepository = mock(UserRepository.class);
        refreshTokenRepository = mock(RefreshTokenRepository.class);
        groupMemberRepository = mock(GroupMemberRepository.class);
        userAccountService = new UserAccountService(
                userRepository, refreshTokenRepository, groupMemberRepository);
    }

    @Test
    void deleteAccountAnonymizesUserAndLeavesGroups() {
        User user = user(1L, "me@test.com", "ENC");
        TravelGroup group = group();
        GroupMember membership = member(group, user, GroupRole.MEMBER);
        when(userRepository.findByEmail("me@test.com")).thenReturn(Optional.of(user));
        when(groupMemberRepository.findByUserIdAndLeftAtIsNull(1L)).thenReturn(List.of(membership));

        userAccountService.deleteAccount("me@test.com");

        assertThat(user.isWithdrawn()).isTrue();
        assertThat(user.getName()).isEqualTo("탈퇴한 사용자");
        assertThat(membership.isActive()).isFalse(); // 비-Owner 그룹에서 soft leave
        verify(refreshTokenRepository).deleteByEmail("me@test.com");
    }

    @Test
    void deleteAccountBlockedWhenUserOwnsGroup() {
        User user = user(1L, "me@test.com", "ENC");
        TravelGroup group = group();
        GroupMember ownerMembership = member(group, user, GroupRole.OWNER);
        when(userRepository.findByEmail("me@test.com")).thenReturn(Optional.of(user));
        when(groupMemberRepository.findByUserIdAndLeftAtIsNull(1L)).thenReturn(List.of(ownerMembership));

        assertThatThrownBy(() -> userAccountService.deleteAccount("me@test.com"))
                .isInstanceOf(BusinessException.class)
                .extracting(e -> ((BusinessException) e).getErrorCode())
                .isEqualTo(ErrorCode.GROUP_OWNER_CANNOT_LEAVE);

        assertThat(user.isWithdrawn()).isFalse(); // 탈퇴 처리되지 않음
        verify(refreshTokenRepository, never()).deleteByEmail(anyString());
    }

    // --- helpers ---

    private User user(Long id, String email, String encodedPassword) {
        User user = User.builder().email(email).password(encodedPassword).name("홍길동").build();
        ReflectionTestUtils.setField(user, "id", id);
        return user;
    }

    private TravelGroup group() {
        TravelGroup group = TravelGroup.builder()
                .title("Trip").destination("Seoul")
                .startDate(LocalDate.of(2026, 7, 1)).endDate(LocalDate.of(2026, 7, 3))
                .inviteCode("ABC123").status(GroupStatus.PLANNING)
                .build();
        ReflectionTestUtils.setField(group, "id", 1L);
        return group;
    }

    private GroupMember member(TravelGroup group, User user, GroupRole role) {
        GroupMember member = GroupMember.builder().travelGroup(group).user(user).role(role).build();
        ReflectionTestUtils.setField(member, "id", user.getId());
        return member;
    }
}
