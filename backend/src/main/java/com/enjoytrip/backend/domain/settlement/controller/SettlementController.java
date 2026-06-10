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

import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/groups/{groupId}/settlements")
@RequiredArgsConstructor
public class SettlementController {

    private final SettlementService settlementService;

    // FR-EXPENSE-04: 그룹 멤버는 멤버별 잔액과 최소 송금 목록을 조회할 수 있다.
    @RequiredGroupMember
    @GetMapping
    public ResponseEntity<ApiResponse<SettlementSummaryResponse>> calculate(@PathVariable Long groupId) {
        SettlementSummaryResponse response = settlementService.calculate(groupId);
        return ResponseEntity.ok(ApiResponse.success("Settlement calculated.", response));
    }
}
