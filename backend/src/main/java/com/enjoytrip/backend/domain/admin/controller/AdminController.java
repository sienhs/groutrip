package com.enjoytrip.backend.domain.admin.controller;

import java.util.List;
import java.util.Map;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.enjoytrip.backend.domain.admin.dto.AdminBadgeRequest;
import com.enjoytrip.backend.domain.admin.dto.AdminBanRequest;
import com.enjoytrip.backend.domain.admin.dto.AdminNameUpdateRequest;
import com.enjoytrip.backend.domain.admin.dto.AdminUserResponse;
import com.enjoytrip.backend.domain.admin.service.AdminService;
import com.enjoytrip.backend.global.response.ApiResponse;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

/** 운영자(본인) 전용 관리 API. 관리자 이메일 계정만 접근할 수 있다. */
@RestController
@RequestMapping("/api/admin")
@RequiredArgsConstructor
public class AdminController {

    private final AdminService adminService;

    // 현재 사용자가 관리자인지 여부(프론트 메뉴/라우트 노출용). 인증만 필요하다.
    @GetMapping("/me")
    public ResponseEntity<ApiResponse<Map<String, Boolean>>> me() {
        return ResponseEntity.ok(ApiResponse.success("OK", Map.of("admin", adminService.isCurrentUserAdmin())));
    }

    @GetMapping("/users")
    public ResponseEntity<ApiResponse<List<AdminUserResponse>>> listUsers() {
        return ResponseEntity.ok(ApiResponse.success("OK", adminService.listUsers()));
    }

    @PatchMapping("/users/{userId}/name")
    public ResponseEntity<ApiResponse<AdminUserResponse>> changeName(
            @PathVariable Long userId,
            @RequestBody @Valid AdminNameUpdateRequest request) {
        return ResponseEntity.ok(ApiResponse.success("OK", adminService.changeName(userId, request.name())));
    }

    @PatchMapping("/users/{userId}/ban")
    public ResponseEntity<ApiResponse<AdminUserResponse>> setBanned(
            @PathVariable Long userId,
            @RequestBody @Valid AdminBanRequest request) {
        return ResponseEntity.ok(ApiResponse.success("OK", adminService.setBanned(userId, request.banned())));
    }

    @PatchMapping("/users/{userId}/badge")
    public ResponseEntity<ApiResponse<AdminUserResponse>> setBadge(
            @PathVariable Long userId,
            @RequestBody @Valid AdminBadgeRequest request) {
        return ResponseEntity.ok(ApiResponse.success("OK", adminService.setBadge(userId, request.badge())));
    }
}
