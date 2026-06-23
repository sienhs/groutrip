package com.enjoytrip.backend.domain.mypage.controller;

import java.util.List;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.enjoytrip.backend.domain.mypage.dto.MyPageResponse;
import com.enjoytrip.backend.domain.mypage.dto.MyStatsResponse;
import com.enjoytrip.backend.domain.mypage.dto.RetrospectiveResponse;
import com.enjoytrip.backend.domain.mypage.service.MyPageService;
import com.enjoytrip.backend.domain.mypage.service.MyStatsService;
import com.enjoytrip.backend.domain.mypage.service.RetrospectiveService;
import com.enjoytrip.backend.global.response.ApiResponse;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;

/**
 * FR-MYPAGE-01/04: 마이페이지 프로필 및 내 여행 회고 모음.
 */
@RestController
@RequestMapping("/api/mypage")
@RequiredArgsConstructor
@Tag(name = "MyPage", description = "마이페이지 API")
public class MyPageController {

    private final MyPageService myPageService;
    private final MyStatsService myStatsService;
    private final RetrospectiveService retrospectiveService;

    @GetMapping
    @Operation(summary = "마이페이지 프로필", description = "FR-MYPAGE-01: 이름/이메일과 성향 벡터를 반환한다.")
    public ResponseEntity<ApiResponse<MyPageResponse>> getMyPage() {
        return ResponseEntity.ok(ApiResponse.success("마이페이지 조회 성공", myPageService.getMyPage()));
    }

    @GetMapping("/stats")
    @Operation(summary = "내 여행 통계", description = "FR-MYPAGE: 여행 횟수·일수·방문 지역·담은 장소·내 결제 총액을 집계한다.")
    public ResponseEntity<ApiResponse<MyStatsResponse>> getMyStats() {
        return ResponseEntity.ok(ApiResponse.success("여행 통계 조회 성공", myStatsService.getMyStats()));
    }

    @GetMapping("/retrospectives")
    @Operation(summary = "내 회고 모음", description = "FR-MYPAGE-04: 내가 작성한 모든 여행 회고를 최신순으로 반환한다.")
    public ResponseEntity<ApiResponse<List<RetrospectiveResponse>>> getMyRetrospectives() {
        return ResponseEntity.ok(ApiResponse.success("회고 모음 조회 성공", retrospectiveService.listMine()));
    }
}
