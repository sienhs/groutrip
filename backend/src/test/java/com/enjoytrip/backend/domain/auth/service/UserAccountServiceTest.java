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
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.util.ReflectionTestUtils;

import com.enjoytrip.backend.domain.auth.dto.AccountDeleteRequest;
import com.enjoytrip.backend.domain.auth.dto.PasswordChangeRequest;
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
    private PasswordEncoder passwordEncoder;
    private GroupMemberRepository groupMemberRepository;
    private UserAccountService userAccountService;

    @BeforeEach
    void setUp() {
        userRepository = mock(UserRepository.class);
        refreshTokenRepository = mock(RefreshTokenRepository.class);
        passwordEncoder = mock(PasswordEncoder.class);
        groupMemberRepository = mock(GroupMemberRepository.class);
        userAccountService = new UserAccountService(
                userRepository, refreshTokenRepository, passwordEncoder, groupMemberRepository);
    }

    @Test
    void changePasswordReplacesHashAndInvalidatesRefreshTokens() {
        User user = user(1L, "me@test.com", "ENC_OLD");
        when(userRepository.findByEmail("me@test.com")).thenReturn(Optional.of(user));
        when(passwordEncoder.matches("Trip1234!", "ENC_OLD")).thenReturn(true);   // 현재 비번 일치
        when(passwordEncoder.matches("NewTrip1234!", "ENC_OLD")).thenReturn(false); // 기존과 다름
        when(passwordEncoder.encode("NewTrip1234!")).thenReturn("ENC_NEW");

        userAccountService.changePassword("me@test.com",
                new PasswordChangeRequest("Trip1234!", "NewTrip1234!"));

        assertThat(user.getPassword()).isEqualTo("ENC_NEW");
        verify(refreshTokenRepository).deleteByEmail("me@test.com");
    }

    @Test
    void changePasswordRejectsWrongCurrentPassword() {
        User user = user(1L, "me@test.com", "ENC_OLD");
        when(userRepository.findByEmail("me@test.com")).thenReturn(Optional.of(user));
        when(passwordEncoder.matches("wrong", "ENC_OLD")).thenReturn(false);

        assertThatThrownBy(() -> userAccountService.changePassword("me@test.com",
                new PasswordChangeRequest("wrong", "NewTrip1234!")))
                .isInstanceOf(BusinessException.class)
                .extracting(e -> ((BusinessException) e).getErrorCode())
                .isEqualTo(ErrorCode.PASSWORD_MISMATCH);
        verify(refreshTokenRepository, never()).deleteByEmail(anyString());
    }

    @Test
    void changePasswordRejectsSameAsOldPassword() {
        User user = user(1L, "me@test.com", "ENC_OLD");
        when(userRepository.findByEmail("me@test.com")).thenReturn(Optional.of(user));
        // 현재 비번 일치 + 새 비번도 기존과 동일 → 같은 stub이 두 번 모두 true를 반환
        when(passwordEncoder.matches("Trip1234!", "ENC_OLD")).thenReturn(true);

        assertThatThrownBy(() -> userAccountService.changePassword("me@test.com",
                new PasswordChangeRequest("Trip1234!", "Trip1234!")))
                .isInstanceOf(BusinessException.class)
                .extracting(e -> ((BusinessException) e).getErrorCode())
                .isEqualTo(ErrorCode.SAME_AS_OLD_PASSWORD);
    }

    @Test
    void deleteAccountAnonymizesUserAndLeavesGroups() {
        User user = user(1L, "me@test.com", "ENC");
        TravelGroup group = group();
        GroupMember membership = member(group, user, GroupRole.MEMBER);
        when(userRepository.findByEmail("me@test.com")).thenReturn(Optional.of(user));
        when(passwordEncoder.matches("Trip1234!", "ENC")).thenReturn(true);
        when(groupMemberRepository.findByUserIdAndLeftAtIsNull(1L)).thenReturn(List.of(membership));

        userAccountService.deleteAccount("me@test.com", new AccountDeleteRequest("Trip1234!"));

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
        when(passwordEncoder.matches("Trip1234!", "ENC")).thenReturn(true);
        when(groupMemberRepository.findByUserIdAndLeftAtIsNull(1L)).thenReturn(List.of(ownerMembership));

        assertThatThrownBy(() -> userAccountService.deleteAccount("me@test.com",
                new AccountDeleteRequest("Trip1234!")))
                .isInstanceOf(BusinessException.class)
                .extracting(e -> ((BusinessException) e).getErrorCode())
                .isEqualTo(ErrorCode.GROUP_OWNER_CANNOT_LEAVE);

        assertThat(user.isWithdrawn()).isFalse(); // 탈퇴 처리되지 않음
        verify(refreshTokenRepository, never()).deleteByEmail(anyString());
    }

    @Test
    void deleteAccountRejectsWrongPassword() {
        User user = user(1L, "me@test.com", "ENC");
        when(userRepository.findByEmail("me@test.com")).thenReturn(Optional.of(user));
        when(passwordEncoder.matches("wrong", "ENC")).thenReturn(false);

        assertThatThrownBy(() -> userAccountService.deleteAccount("me@test.com",
                new AccountDeleteRequest("wrong")))
                .isInstanceOf(BusinessException.class)
                .extracting(e -> ((BusinessException) e).getErrorCode())
                .isEqualTo(ErrorCode.PASSWORD_MISMATCH);
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
