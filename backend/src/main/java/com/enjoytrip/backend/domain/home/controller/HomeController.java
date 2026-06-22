package com.enjoytrip.backend.domain.home.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.enjoytrip.backend.domain.home.dto.HomeResponse;
import com.enjoytrip.backend.domain.home.service.HomeService;
import com.enjoytrip.backend.global.response.ApiResponse;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;

/**
 * FR-HOME: 로그인 후 홈 대시보드.
 */
@RestController
@RequestMapping("/api/home")
@RequiredArgsConstructor
@Tag(name = "Home", description = "홈 대시보드 API")
public class HomeController {

    private final HomeService homeService;

    @GetMapping
    @Operation(
            summary = "홈 대시보드",
            description = "FR-HOME-01~03: 진행/예정/완료 그룹 카드와 미정산 금액·진행 중 투표 수 알림을 반환한다."
    )
    public ResponseEntity<ApiResponse<HomeResponse>> getHome() {
        return ResponseEntity.ok(ApiResponse.success("홈 조회 성공", homeService.getHome()));
    }
}
