package com.enjoytrip.backend.domain.auth.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.enjoytrip.backend.domain.auth.service.UserAccountService;
import com.enjoytrip.backend.global.response.ApiResponse;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;

/**
 * FR-AUTH-06: 본인 계정 관리 API. 인증된 사용자만 호출할 수 있다.
 * 인증은 SNS(OAuth) 전용이라 비밀번호 변경은 제공하지 않는다.
 */
@RestController
@RequestMapping("/api/users/me")
@RequiredArgsConstructor
@Tag(name = "User Account", description = "계정 탈퇴 API")
public class UserAccountController {

    private static final String REFRESH_TOKEN_COOKIE = "refresh_token";

    private final UserAccountService userAccountService;

    @DeleteMapping
    @Operation(
            summary = "계정 탈퇴",
            description = """
                    FR-AUTH-06: 인증된 본인 계정을 탈퇴한다(SNS 전용이라 비밀번호 재확인은 없으며, 확인은 클라이언트에서 처리).
                    Owner인 그룹이 남아있으면 위임 또는 해체가 선행되어야 한다.
                    탈퇴 시 개인정보는 즉시 익명화되며 작성 기록은 보존된다(30일 후 영구 삭제).
                    """
    )
    public ResponseEntity<ApiResponse<Void>> deleteAccount(
            @AuthenticationPrincipal UserDetails userDetails,
            HttpServletResponse response
    ) {
        userAccountService.deleteAccount(userDetails.getUsername());
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
