package com.enjoytrip.backend.domain.settlement.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.enjoytrip.backend.domain.group.aop.RequiredGroupMember;
import com.enjoytrip.backend.domain.settlement.dto.SettlementSummaryResponse;
import com.enjoytrip.backend.domain.settlement.service.SettlementService;
import com.enjoytrip.backend.global.response.ApiResponse;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/groups/{groupId}/settlements")
@RequiredArgsConstructor
@Tag(name = "Settlement", description = "그룹 지출 기반 정산 계산 API")
public class SettlementController {

    private final SettlementService settlementService;

    // FR-EXPENSE-04: 그룹 지출을 기준으로 멤버별 잔액과 최소 송금 목록을 계산한다.
    @RequiredGroupMember
    @GetMapping
    @Operation(
            summary = "정산 요약 조회",
            description = """
                    FR-EXPENSE-04: 그룹 멤버별 정산 잔액과 최소 송금 목록을 계산해서 조회한다.
                    잔액은 '내가 결제한 금액 - 내가 부담해야 할 금액' 기준이며, 양수는 받을 금액, 음수는 보낼 금액이다.
                    송금 목록은 SRS의 greedy 최소 이체 알고리즘을 사용해서 보낼 사람과 받을 사람을 매칭한다.
                    실제 Toss/KakaoPay 송금 실행이나 완료 검증은 하지 않으며, 사용자가 별도로 완료 여부를 확인하는 흐름과 연결될 예정이다.
                    """
    )
    public ResponseEntity<ApiResponse<SettlementSummaryResponse>> calculate(
            @Parameter(description = "정산을 계산할 그룹 ID", example = "1")
            @PathVariable Long groupId
    ) {
        SettlementSummaryResponse response = settlementService.calculate(groupId);
        return ResponseEntity.ok(ApiResponse.success("Settlement calculated.", response));
    }
}
