package com.enjoytrip.backend.domain.auth.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.enjoytrip.backend.domain.auth.dto.AccountDeleteRequest;
import com.enjoytrip.backend.domain.auth.dto.PasswordChangeRequest;
import com.enjoytrip.backend.domain.auth.service.UserAccountService;
import com.enjoytrip.backend.global.response.ApiResponse;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

/**
 * FR-AUTH-05/06: 본인 계정 관리 API. 인증된 사용자만 호출할 수 있다.
 */
@RestController
@RequestMapping("/api/users/me")
@RequiredArgsConstructor
@Tag(name = "User Account", description = "비밀번호 변경, 계정 탈퇴 API")
public class UserAccountController {

    private static final String REFRESH_TOKEN_COOKIE = "refresh_token";

    private final UserAccountService userAccountService;

    @PatchMapping("/password")
    @Operation(
            summary = "비밀번호 변경",
            description = """
                    FR-AUTH-05: 현재 비밀번호 확인 후 새 비밀번호로 변경한다.
                    새 비밀번호는 회원가입과 동일한 규칙을 적용하며 기존과 동일하면 거부한다.
                    변경 성공 시 모든 디바이스의 Refresh Token이 무효화되어 재로그인이 필요하다.
                    """
    )
    public ResponseEntity<ApiResponse<Void>> changePassword(
            @AuthenticationPrincipal UserDetails userDetails,
            @RequestBody @Valid PasswordChangeRequest request,
            HttpServletResponse response
    ) {
        userAccountService.changePassword(userDetails.getUsername(), request);
        clearRefreshTokenCookie(response);
        return ResponseEntity.ok(ApiResponse.success("비밀번호가 변경되었습니다. 다시 로그인해주세요."));
    }

    @DeleteMapping
    @Operation(
            summary = "계정 탈퇴",
            description = """
                    FR-AUTH-06: 비밀번호 재확인 후 계정을 탈퇴한다.
                    Owner인 그룹이 남아있으면 위임 또는 해체가 선행되어야 한다.
                    탈퇴 시 개인정보는 즉시 익명화되며 작성 기록은 보존된다(30일 후 영구 삭제).
                    """
    )
    public ResponseEntity<ApiResponse<Void>> deleteAccount(
            @AuthenticationPrincipal UserDetails userDetails,
            @RequestBody @Valid AccountDeleteRequest request,
            HttpServletResponse response
    ) {
        userAccountService.deleteAccount(userDetails.getUsername(), request);
        clearRefreshTokenCookie(response);
        return ResponseEntity.ok(ApiResponse.success("회원 탈퇴가 완료되었습니다."));
    }

    // 비밀번호 변경/탈퇴 후 클라이언트의 refresh_token 쿠키를 제거해 재로그인을 강제한다.
    private void clearRefreshTokenCookie(HttpServletResponse response) {
        Cookie cookie = new Cookie(REFRESH_TOKEN_COOKIE, null);
        cookie.setMaxAge(0);
        cookie.setPath("/");
        response.addCookie(cookie);
    }
}
