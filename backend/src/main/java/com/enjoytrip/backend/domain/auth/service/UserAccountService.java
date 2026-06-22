package com.enjoytrip.backend.domain.auth.service;

import java.util.List;

import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.enjoytrip.backend.domain.auth.dto.AccountDeleteRequest;
import com.enjoytrip.backend.domain.auth.dto.PasswordChangeRequest;
import com.enjoytrip.backend.domain.auth.entity.User;
import com.enjoytrip.backend.domain.auth.repository.RefreshTokenRepository;
import com.enjoytrip.backend.domain.auth.repository.UserRepository;
import com.enjoytrip.backend.domain.group.entity.GroupMember;
import com.enjoytrip.backend.domain.group.repository.GroupMemberRepository;
import com.enjoytrip.backend.global.exception.BusinessException;
import com.enjoytrip.backend.global.exception.ErrorCode;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

/**
 * FR-AUTH-05/06: 본인 계정 관리(비밀번호 변경, 계정 탈퇴).
 */
@Slf4j
@Service
@RequiredArgsConstructor
@Transactional
public class UserAccountService {

    private final UserRepository userRepository;
    private final RefreshTokenRepository refreshTokenRepository;
    private final PasswordEncoder passwordEncoder;
    private final GroupMemberRepository groupMemberRepository;

    /**
     * FR-AUTH-05: 비밀번호 변경.
     * 현재 비밀번호를 검증하고 기존과 다른 새 비밀번호로 교체한 뒤, 모든 디바이스의 Refresh Token을 무효화한다.
     */
    public void changePassword(String email, PasswordChangeRequest request) {
        User user = findActiveUser(email);

        if (!passwordEncoder.matches(request.currentPassword(), user.getPassword())) {
            throw new BusinessException(ErrorCode.PASSWORD_MISMATCH);
        }
        if (passwordEncoder.matches(request.newPassword(), user.getPassword())) {
            throw new BusinessException(ErrorCode.SAME_AS_OLD_PASSWORD);
        }

        user.changePassword(passwordEncoder.encode(request.newPassword()));
        // 변경 성공 시 재로그인 강제: 저장된 Refresh Token 전부 제거.
        refreshTokenRepository.deleteByEmail(email);
        log.info("비밀번호 변경: {}", email);
    }

    /**
     * FR-AUTH-06: 계정 탈퇴.
     * 비밀번호 재확인 후, Owner인 그룹이 남아있으면 거부한다(위임/해체 선행 필요).
     * 그 외 그룹에서는 탈퇴 처리하고 개인정보를 익명화한다(기록은 보존, 30일 후 hard delete 대상).
     */
    public void deleteAccount(String email, AccountDeleteRequest request) {
        User user = findActiveUser(email);

        if (!passwordEncoder.matches(request.password(), user.getPassword())) {
            throw new BusinessException(ErrorCode.PASSWORD_MISMATCH);
        }

        List<GroupMember> memberships = groupMemberRepository.findByUserIdAndLeftAtIsNull(user.getId());
        boolean ownsAnyGroup = memberships.stream().anyMatch(GroupMember::isOwner);
        if (ownsAnyGroup) {
            // Owner는 위임 또는 그룹 해체 후에만 탈퇴 가능(FR-AUTH-06 / FR-GROUP-05).
            throw new BusinessException(ErrorCode.GROUP_OWNER_CANNOT_LEAVE);
        }

        // 일반 멤버로 속한 그룹에서는 soft leave 처리(작성 데이터는 "(탈퇴한 사용자)"로 보존).
        memberships.forEach(GroupMember::leave);

        user.withdraw();
        refreshTokenRepository.deleteByEmail(email);
        log.info("계정 탈퇴: userId={}", user.getId());
    }

    private User findActiveUser(String email) {
        return userRepository.findByEmail(email)
                .filter(user -> !user.isWithdrawn())
                .orElseThrow(() -> new BusinessException(ErrorCode.USER_NOT_FOUND));
    }
}
