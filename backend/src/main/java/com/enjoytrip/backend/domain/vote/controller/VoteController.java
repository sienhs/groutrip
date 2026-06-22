package com.enjoytrip.backend.domain.vote.controller;

import java.util.List;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.enjoytrip.backend.domain.group.aop.RequiredGroupMember;
import com.enjoytrip.backend.domain.vote.dto.CandidateRegisterRequest;
import com.enjoytrip.backend.domain.vote.dto.VoteCastRequest;
import com.enjoytrip.backend.domain.vote.dto.VoteCloseRequest;
import com.enjoytrip.backend.domain.vote.dto.VoteSessionCreateRequest;
import com.enjoytrip.backend.domain.vote.dto.VoteSessionResponse;
import com.enjoytrip.backend.domain.vote.service.VoteService;
import com.enjoytrip.backend.global.response.ApiResponse;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

/**
 * FR-VOTE-01~04: 일정 투표 API. 모든 진입점은 그룹 멤버 권한이 필요하다.
 */
@RestController
@RequestMapping("/api/groups/{groupId}")
@RequiredArgsConstructor
@Tag(name = "Vote", description = "일정 투표 API")
public class VoteController {

    private final VoteService voteService;

    @RequiredGroupMember
    @PostMapping("/schedules/{scheduleId}/vote-sessions")
    @Operation(summary = "투표 세션 생성", description = "FR-VOTE-01: 일정 슬롯에 투표를 시작한다. 대상 일정은 VOTING 상태가 된다.")
    public ResponseEntity<ApiResponse<VoteSessionResponse>> createSession(
            @Parameter(description = "그룹 ID", example = "1") @PathVariable Long groupId,
            @Parameter(description = "일정 ID", example = "10") @PathVariable Long scheduleId,
            @RequestBody @Valid VoteSessionCreateRequest request
    ) {
        VoteSessionResponse response = voteService.createSession(groupId, scheduleId, request);
        return ResponseEntity.ok(ApiResponse.success("투표가 시작되었어요.", response));
    }

    @RequiredGroupMember
    @GetMapping("/schedules/{scheduleId}/vote-sessions")
    @Operation(summary = "일정 투표 세션 목록", description = "FR-VOTE-04: 해당 일정의 투표 세션을 최신순으로 조회한다.")
    public ResponseEntity<ApiResponse<List<VoteSessionResponse>>> getSessionsBySchedule(
            @Parameter(description = "그룹 ID", example = "1") @PathVariable Long groupId,
            @Parameter(description = "일정 ID", example = "10") @PathVariable Long scheduleId
    ) {
        List<VoteSessionResponse> response = voteService.getSessionsBySchedule(groupId, scheduleId);
        return ResponseEntity.ok(ApiResponse.success("투표 세션 조회 성공", response));
    }

    @RequiredGroupMember
    @GetMapping("/vote-sessions/{sessionId}")
    @Operation(summary = "투표 결과 조회", description = "FR-VOTE-04: 후보별 득점과 실명 투표자 명단, 내 투표 여부를 조회한다.")
    public ResponseEntity<ApiResponse<VoteSessionResponse>> getSession(
            @Parameter(description = "그룹 ID", example = "1") @PathVariable Long groupId,
            @Parameter(description = "투표 세션 ID", example = "5") @PathVariable Long sessionId
    ) {
        VoteSessionResponse response = voteService.getSession(groupId, sessionId);
        return ResponseEntity.ok(ApiResponse.success("투표 결과 조회 성공", response));
    }

    @RequiredGroupMember
    @PostMapping("/vote-sessions/{sessionId}/candidates")
    @Operation(summary = "후보 등록", description = "FR-VOTE-01: 후보 장소를 등록한다. 멤버당 최대 5개.")
    public ResponseEntity<ApiResponse<VoteSessionResponse>> registerCandidate(
            @Parameter(description = "그룹 ID", example = "1") @PathVariable Long groupId,
            @Parameter(description = "투표 세션 ID", example = "5") @PathVariable Long sessionId,
            @RequestBody @Valid CandidateRegisterRequest request
    ) {
        VoteSessionResponse response = voteService.registerCandidate(groupId, sessionId, request);
        return ResponseEntity.ok(ApiResponse.success("후보가 등록되었어요.", response));
    }

    @RequiredGroupMember
    @PostMapping("/vote-sessions/{sessionId}/votes")
    @Operation(summary = "투표", description = "FR-VOTE-02: 후보에 1~5점을 부여한다. 재투표 시 점수가 갱신된다.")
    public ResponseEntity<ApiResponse<VoteSessionResponse>> castVote(
            @Parameter(description = "그룹 ID", example = "1") @PathVariable Long groupId,
            @Parameter(description = "투표 세션 ID", example = "5") @PathVariable Long sessionId,
            @RequestBody @Valid VoteCastRequest request
    ) {
        VoteSessionResponse response = voteService.castVote(groupId, sessionId, request);
        return ResponseEntity.ok(ApiResponse.success("투표가 완료되었어요.", response));
    }

    @RequiredGroupMember
    @PostMapping("/vote-sessions/{sessionId}/close")
    @Operation(
            summary = "투표 마감/채택",
            description = """
                    FR-VOTE-03: 투표를 마감하고 당선 후보 장소를 일정으로 승격한다.
                    candidateId를 보내면 수동 채택, 없으면 최다 득표 후보 자동 채택(동점 시 candidateId 필요).
                    Owner 또는 세션 생성자/후보 등록자만 가능하다.
                    """
    )
    public ResponseEntity<ApiResponse<VoteSessionResponse>> close(
            @Parameter(description = "그룹 ID", example = "1") @PathVariable Long groupId,
            @Parameter(description = "투표 세션 ID", example = "5") @PathVariable Long sessionId,
            @RequestBody(required = false) VoteCloseRequest request
    ) {
        VoteCloseRequest safeRequest = request == null ? new VoteCloseRequest(null) : request;
        VoteSessionResponse response = voteService.close(groupId, sessionId, safeRequest);
        return ResponseEntity.ok(ApiResponse.success("투표가 마감되었어요.", response));
    }
}
