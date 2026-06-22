package com.enjoytrip.backend.domain.mypage.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.enjoytrip.backend.domain.group.aop.RequiredGroupMember;
import com.enjoytrip.backend.domain.mypage.dto.RetrospectiveRequest;
import com.enjoytrip.backend.domain.mypage.dto.RetrospectiveResponse;
import com.enjoytrip.backend.domain.mypage.service.RetrospectiveService;
import com.enjoytrip.backend.global.response.ApiResponse;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

/**
 * FR-MYPAGE-04: 그룹 단위 회고 작성/조회. 종료된 그룹에 대해 본인만 가능하다.
 */
@RestController
@RequestMapping("/api/groups/{groupId}/retrospective")
@RequiredArgsConstructor
@Tag(name = "Retrospective", description = "여행 회고 API")
public class RetrospectiveController {

    private final RetrospectiveService retrospectiveService;

    @RequiredGroupMember
    @PutMapping
    @Operation(
            summary = "회고 작성/수정",
            description = "FR-MYPAGE-04: 종료된 그룹에 한 줄 후기 + 별점을 남긴다. 그룹·사용자당 1건이며 재호출 시 갱신된다."
    )
    public ResponseEntity<ApiResponse<RetrospectiveResponse>> upsert(
            @Parameter(description = "그룹 ID", example = "1") @PathVariable Long groupId,
            @RequestBody @Valid RetrospectiveRequest request
    ) {
        RetrospectiveResponse response = retrospectiveService.upsert(groupId, request);
        return ResponseEntity.ok(ApiResponse.success("회고가 저장되었어요.", response));
    }

    @RequiredGroupMember
    @GetMapping
    @Operation(summary = "내 회고 조회", description = "FR-MYPAGE-04: 해당 그룹에 대한 내 회고를 조회한다(본인만).")
    public ResponseEntity<ApiResponse<RetrospectiveResponse>> getMine(
            @Parameter(description = "그룹 ID", example = "1") @PathVariable Long groupId
    ) {
        RetrospectiveResponse response = retrospectiveService.getMine(groupId);
        return ResponseEntity.ok(ApiResponse.success("회고 조회 성공", response));
    }
}
