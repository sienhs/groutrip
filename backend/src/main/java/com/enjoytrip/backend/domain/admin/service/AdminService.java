package com.enjoytrip.backend.domain.admin.service;

import java.util.List;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.enjoytrip.backend.domain.admin.dto.AdminUserResponse;
import com.enjoytrip.backend.domain.auth.entity.User;
import com.enjoytrip.backend.domain.auth.repository.UserRepository;
import com.enjoytrip.backend.domain.group.service.CurrentUserResolver;
import com.enjoytrip.backend.global.exception.BusinessException;
import com.enjoytrip.backend.global.exception.ErrorCode;

import lombok.RequiredArgsConstructor;

/**
 * 서비스 운영자(본인) 전용 관리 기능.
 * 관리자는 이메일로 식별하며(app.admin-email), 임의 사용자의 닉네임 변경·계정 정지·장난 배지를 다룬다.
 */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class AdminService {

    private final UserRepository userRepository;
    private final CurrentUserResolver currentUserResolver;

    // 관리자 이메일(설정 미지정 시 운영자 기본값). 이 이메일 계정만 관리 기능을 쓸 수 있다.
    @Value("${app.admin-email:tldps712@gmail.com}")
    private String adminEmail;

    // 현재 로그인 사용자가 관리자면 true (프론트 메뉴 노출 판단용).
    public boolean isCurrentUserAdmin() {
        return adminEmail.equalsIgnoreCase(currentUserResolver.getCurrentUser().getEmail());
    }

    public List<AdminUserResponse> listUsers() {
        requireAdmin();
        return userRepository.findByDeletedAtIsNullOrderByIdAsc()
                .stream().map(AdminUserResponse::from).toList();
    }

    @Transactional
    public AdminUserResponse changeName(Long userId, String name) {
        requireAdmin();
        User target = findTarget(userId);
        target.updateName(name);
        return AdminUserResponse.from(target);
    }

    @Transactional
    public AdminUserResponse setBanned(Long userId, boolean banned) {
        User admin = requireAdmin();
        User target = findTarget(userId);
        // 관리자 본인은 정지할 수 없다(스스로 잠기는 사고 방지).
        if (target.getId().equals(admin.getId())) {
            throw new BusinessException(ErrorCode.INVALID_INPUT);
        }
        target.setBanned(banned);
        return AdminUserResponse.from(target);
    }

    @Transactional
    public AdminUserResponse setBadge(Long userId, String badge) {
        requireAdmin();
        User target = findTarget(userId);
        target.setBadge(badge);
        return AdminUserResponse.from(target);
    }

    // 관리자 인증 확인 후 관리자 User를 반환한다.
    private User requireAdmin() {
        User current = currentUserResolver.getCurrentUser();
        if (!adminEmail.equalsIgnoreCase(current.getEmail())) {
            throw new BusinessException(ErrorCode.ADMIN_FORBIDDEN);
        }
        return current;
    }

    private User findTarget(Long userId) {
        return userRepository.findById(userId)
                .filter(user -> !user.isWithdrawn())
                .orElseThrow(() -> new BusinessException(ErrorCode.USER_NOT_FOUND));
    }
}
