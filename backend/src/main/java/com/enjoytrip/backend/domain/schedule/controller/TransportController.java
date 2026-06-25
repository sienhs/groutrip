package com.enjoytrip.backend.domain.schedule.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.enjoytrip.backend.domain.expense.dto.ExpenseResponse;
import com.enjoytrip.backend.domain.group.aop.RequiredGroupMember;
import com.enjoytrip.backend.domain.schedule.dto.TransportExpenseRequest;
import com.enjoytrip.backend.domain.schedule.dto.TransportLegResponse;
import com.enjoytrip.backend.domain.schedule.dto.TransportPathResponse;
import com.enjoytrip.backend.domain.schedule.entity.TransportMode;
import com.enjoytrip.backend.domain.schedule.service.ScheduleExpenseService;
import com.enjoytrip.backend.domain.schedule.service.TransportService;
import com.enjoytrip.backend.global.response.ApiResponse;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

/**
 * FR-SCHEDULE-04 / FR-EXPENSE-07: 일정 간 이동 정보 조회 및 이동 비용의 정산 등록.
 */
@RestController
@RequestMapping("/api/groups/{groupId}/schedules")
@RequiredArgsConstructor
@Tag(name = "Transport", description = "이동 시간/비용 및 이동 비용 정산 등록 API")
public class TransportController {

    private final TransportService transportService;
    private final ScheduleExpenseService scheduleExpenseService;

    @RequiredGroupMember
    @GetMapping("/transport")
    @Operation(
            summary = "이동 정보 조회",
            description = """
                    FR-SCHEDULE-04: 두 일정 사이의 이동 시간/거리/비용을 수단별로 조회한다.
                    자동차는 카카오 모빌리티(톨비/택시비) + 연료비 자체 계산, 도보는 좌표 기반 추정이다.
                    대중교통은 공개 API 미지원으로 available=false로 응답한다. 결과는 1시간 캐시된다.
                    """
    )
    public ResponseEntity<ApiResponse<TransportLegResponse>> getTransport(
            @Parameter(description = "그룹 ID", example = "1")
            @PathVariable Long groupId,
            @Parameter(description = "출발 일정 ID", example = "10")
            @RequestParam Long fromScheduleId,
            @Parameter(description = "도착 일정 ID", example = "11")
            @RequestParam Long toScheduleId,
            @Parameter(description = "이동 수단", example = "CAR")
            @RequestParam TransportMode mode
    ) {
        TransportLegResponse response = transportService.getLeg(groupId, fromScheduleId, toScheduleId, mode);
        return ResponseEntity.ok(ApiResponse.success("이동 정보 조회 성공", response));
    }

    @RequiredGroupMember
    @GetMapping("/transport-path")
    @Operation(
            summary = "이동 경로(도로 좌표) 조회",
            description = """
                    두 일정 사이의 자동차 이동 경로를 도로 좌표열([위도,경도] 목록)로 반환한다.
                    여행 일정 지도에서 실제 이동 경로 선을 그릴 때 사용한다. 실패 시 available=false.
                    """
    )
    public ResponseEntity<ApiResponse<TransportPathResponse>> getTransportPath(
            @Parameter(description = "그룹 ID", example = "1")
            @PathVariable Long groupId,
            @Parameter(description = "출발 일정 ID", example = "10")
            @RequestParam Long fromScheduleId,
            @Parameter(description = "도착 일정 ID", example = "11")
            @RequestParam Long toScheduleId
    ) {
        TransportPathResponse response = transportService.getRoutePath(groupId, fromScheduleId, toScheduleId);
        return ResponseEntity.ok(ApiResponse.success("이동 경로 조회 성공", response));
    }

    @RequiredGroupMember
    @PostMapping("/transport-expense")
    @Operation(
            summary = "이동 비용 정산 등록",
            description = """
                    FR-EXPENSE-07: 사용자가 명시적으로 이동 비용을 정산에 추가한다(자동 등록 아님).
                    costType(DRIVING=톨비+연료비, TAXI=택시비, TRANSIT=운임×인원)에 따라 금액을 산출해
                    category=TRANSPORT, 균등 분담으로 지출을 등록한다. 등록 후 실제 금액으로 수정 가능하다.
                    """
    )
    public ResponseEntity<ApiResponse<ExpenseResponse>> registerTransportExpense(
            @Parameter(description = "그룹 ID", example = "1")
            @PathVariable Long groupId,
            @RequestBody @Valid TransportExpenseRequest request
    ) {
        ExpenseResponse response = scheduleExpenseService.registerTransportExpense(groupId, request);
        return ResponseEntity.ok(ApiResponse.success("이동 비용이 정산에 추가되었어요.", response));
    }
}
