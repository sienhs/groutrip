package com.enjoytrip.backend.domain.admin.dto;

import com.enjoytrip.backend.domain.auth.entity.User;

/** 관리자 화면에 노출할 사용자 요약. */
public record AdminUserResponse(
        Long id,
        String email,
        String name,
        String badge,
        boolean banned
) {
    public static AdminUserResponse from(User user) {
        return new AdminUserResponse(
                user.getId(),
                user.getEmail(),
                user.getName(),
                user.getBadge(),
                user.isBanned()
        );
    }
}
