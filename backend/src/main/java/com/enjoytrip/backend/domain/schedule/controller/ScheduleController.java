package com.enjoytrip.backend.domain.schedule.controller;

import java.time.LocalDate;
import java.util.List;

import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.enjoytrip.backend.domain.group.aop.RequiredGroupMember;
import com.enjoytrip.backend.domain.group.aop.RequiredGroupOwner;
import com.enjoytrip.backend.domain.schedule.dto.ScheduleSetPlaceRequest;
import com.enjoytrip.backend.domain.schedule.dto.ScheduleCreateRequest;
import com.enjoytrip.backend.domain.schedule.dto.ScheduleReorderRequest;
import com.enjoytrip.backend.domain.schedule.dto.ScheduleResponse;
import com.enjoytrip.backend.domain.schedule.dto.ScheduleUpdateRequest;
import com.enjoytrip.backend.domain.schedule.service.ScheduleService;
import com.enjoytrip.backend.global.response.ApiResponse;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

/**
 * FR-SCHEDULE-01~03/06: 그룹 일정 CRUD 및 드래그 reorder. 모든 진입점은 그룹 멤버 권한이 필요하다.
 */
@RestController
@RequestMapping("/api/groups/{groupId}/schedules")
@RequiredArgsConstructor
@Tag(name = "Schedule", description = "그룹 일정 빌더 API")
public class ScheduleController {

    private final ScheduleService scheduleService;

    @RequiredGroupMember
    @PostMapping
    @Operation(
            summary = "일정 추가",
            description = "FR-SCHEDULE-01: 일자/시간/장소로 일정을 추가한다. 새 항목은 해당 일자의 마지막 순서로 배치된다."
    )
    public ResponseEntity<ApiResponse<ScheduleResponse>> create(
            @Parameter(description = "그룹 ID", example = "1")
            @PathVariable Long groupId,
            @RequestBody @Valid ScheduleCreateRequest request
    ) {
        ScheduleResponse response = scheduleService.create(groupId, request);
        return ResponseEntity.ok(ApiResponse.success("일정이 추가되었습니다.", response));
    }

    @RequiredGroupMember
    @GetMapping
    @Operation(
            summary = "일정 조회",
            description = "FR-SCHEDULE: 그룹 일정을 일자→순서로 조회한다. date 파라미터가 있으면 해당 일자만 조회한다."
    )
    public ResponseEntity<ApiResponse<List<ScheduleResponse>>> getSchedules(
            @Parameter(description = "그룹 ID", example = "1")
            @PathVariable Long groupId,
            @Parameter(description = "조회할 일자(미지정 시 전체)", example = "2026-07-01")
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date
    ) {
        List<ScheduleResponse> response = scheduleService.getSchedules(groupId, date);
        return ResponseEntity.ok(ApiResponse.success("일정 조회 성공", response));
    }

    @RequiredGroupMember
    @PatchMapping("/{scheduleId}")
    @Operation(
            summary = "일정 수정",
            description = "FR-SCHEDULE-02: 그룹 멤버 누구나 시간/메모/예상비용/이동수단/상태를 수정한다. 마지막 수정자가 기록된다."
    )
    public ResponseEntity<ApiResponse<ScheduleResponse>> update(
            @Parameter(description = "그룹 ID", example = "1")
            @PathVariable Long groupId,
            @Parameter(description = "수정할 일정 ID", example = "10")
            @PathVariable Long scheduleId,
            @RequestBody @Valid ScheduleUpdateRequest request
    ) {
        ScheduleResponse response = scheduleService.update(groupId, scheduleId, request);
        return ResponseEntity.ok(ApiResponse.success("일정이 수정되었습니다.", response));
    }

    // FR-VOTE-03 대안: 빈 일정 장소를 Owner가 직접 확정(투표 대신).
    @RequiredGroupOwner
    @PatchMapping("/{scheduleId}/place")
    @Operation(
            summary = "일정 장소 직접 확정(Owner)",
            description = "빈 일정(장소 미정)의 장소를 Owner가 투표 없이 직접 정한다."
    )
    public ResponseEntity<ApiResponse<ScheduleResponse>> setPlace(
            @PathVariable Long groupId,
            @PathVariable Long scheduleId,
            @RequestBody @Valid ScheduleSetPlaceRequest request
    ) {
        ScheduleResponse response = scheduleService.setPlace(groupId, scheduleId, request);
        return ResponseEntity.ok(ApiResponse.success("일정 장소가 확정되었습니다.", response));
    }

    @RequiredGroupMember
    @DeleteMapping("/{scheduleId}")
    @Operation(
            summary = "일정 삭제",
            description = "FR-SCHEDULE-02: 그룹 멤버 누구나 일정을 삭제한다."
    )
    public ResponseEntity<ApiResponse<Void>> delete(
            @Parameter(description = "그룹 ID", example = "1")
            @PathVariable Long groupId,
            @Parameter(description = "삭제할 일정 ID", example = "10")
            @PathVariable Long scheduleId
    ) {
        scheduleService.delete(groupId, scheduleId);
        return ResponseEntity.ok(ApiResponse.success("일정이 삭제되었습니다."));
    }

    @RequiredGroupMember
    @PatchMapping("/reorder")
    @Operation(
            summary = "일정 순서 변경 (드래그 앤 드롭)",
            description = """
                    FR-SCHEDULE-03: 드래그 종료 시점에 변경된 모든 일정의 최종 (일자, 순서)를 한 번에 반영한다.
                    같은 일자 순서 변경과 다른 일자로의 이동을 모두 지원한다.
                    """
    )
    public ResponseEntity<ApiResponse<List<ScheduleResponse>>> reorder(
            @Parameter(description = "그룹 ID", example = "1")
            @PathVariable Long groupId,
            @RequestBody @Valid ScheduleReorderRequest request
    ) {
        List<ScheduleResponse> response = scheduleService.reorder(groupId, request);
        return ResponseEntity.ok(ApiResponse.success("일정 순서가 변경되었습니다.", response));
    }
}
