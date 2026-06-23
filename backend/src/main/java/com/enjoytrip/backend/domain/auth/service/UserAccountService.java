package com.enjoytrip.backend.domain.auth.service;

import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

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
 * FR-AUTH-06: 본인 계정 관리(계정 탈퇴). 인증은 SNS 전용이라 비밀번호 개념이 없다.
 */
@Slf4j
@Service
@RequiredArgsConstructor
@Transactional
public class UserAccountService {

    private final UserRepository userRepository;
    private final RefreshTokenRepository refreshTokenRepository;
    private final GroupMemberRepository groupMemberRepository;

    /**
     * FR-MYPAGE: 표시 이름 변경. 변경된 이름을 반환한다.
     */
    public String updateName(String email, String name) {
        User user = findActiveUser(email);
        user.updateName(name.trim());
        log.info("이름 변경: userId={}", user.getId());
        return user.getName();
    }

    /**
     * FR-AUTH-06: 계정 탈퇴.
     * 본인 확인은 클라이언트 측 확인 절차로 대체한다(SNS 전용이라 비밀번호 재확인 없음).
     * Owner인 그룹이 남아있으면 거부한다(위임/해체 선행 필요).
     * 그 외 그룹에서는 탈퇴 처리하고 개인정보를 익명화한다(기록은 보존, 30일 후 hard delete 대상).
     */
    public void deleteAccount(String email) {
        User user = findActiveUser(email);

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
