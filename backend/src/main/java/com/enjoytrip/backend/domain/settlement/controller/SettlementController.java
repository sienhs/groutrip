package com.enjoytrip.backend.domain.settlement.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.enjoytrip.backend.domain.group.aop.RequiredGroupMember;
import com.enjoytrip.backend.domain.group.aop.RequiredGroupOwner;
import com.enjoytrip.backend.domain.settlement.dto.SettlementProgressResponse;
import com.enjoytrip.backend.domain.settlement.dto.SettlementPaymentLinksResponse;
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

    // FR-EXPENSE-06: 현재 계산 결과를 PENDING 송금 스냅샷으로 확정한다. 그룹 Owner만 시작할 수 있다.
    @RequiredGroupOwner
    @PostMapping
    @Operation(
            summary = "정산 확인 시작",
            description = "현재 최소 송금 계산 결과를 저장하고 각 송금 건을 PENDING 상태로 시작한다. (그룹 Owner 전용)"
    )
    public ResponseEntity<ApiResponse<SettlementProgressResponse>> start(@PathVariable Long groupId) {
        SettlementProgressResponse response = settlementService.start(groupId);
        return ResponseEntity.ok(ApiResponse.success("Settlement started.", response));
    }

    // FR-EXPENSE-06: 저장된 송금별 확인 상태와 전체 완료 여부를 조회한다.
    @RequiredGroupMember
    @GetMapping("/progress")
    @Operation(summary = "정산 진행 상태 조회")
    public ResponseEntity<ApiResponse<SettlementProgressResponse>> findProgress(@PathVariable Long groupId) {
        SettlementProgressResponse response = settlementService.findProgress(groupId);
        return ResponseEntity.ok(ApiResponse.success("Settlement progress found.", response));
    }

    // FR-EXPENSE-05: 송금자 본인이 모바일 앱 실행 또는 PC QR 생성에 사용할 URL을 조회한다.
    @RequiredGroupMember
    @GetMapping("/{settlementId}/payment-links")
    @Operation(
            summary = "송금 딥링크 조회",
            description = """
                    PENDING 상태인 본인 송금의 Toss/KakaoPay URL Scheme을 반환한다.
                    PC에서는 프론트가 반환 URL을 QR로 인코딩하며, 서버는 실제 결제 실행이나 성공을 검증하지 않는다.
                    """
    )
    public ResponseEntity<ApiResponse<SettlementPaymentLinksResponse>> createPaymentLinks(
            @PathVariable Long groupId,
            @PathVariable Long settlementId
    ) {
        SettlementPaymentLinksResponse response = settlementService.createPaymentLinks(groupId, settlementId);
        return ResponseEntity.ok(ApiResponse.success("Payment links created.", response));
    }

    // 송금자 본인이 실제 앱 송금을 완료했음을 체크한다.
    @RequiredGroupMember
    @PatchMapping("/{settlementId}/sent")
    @Operation(summary = "송금 완료 확인")
    public ResponseEntity<ApiResponse<SettlementProgressResponse>> confirmSent(
            @PathVariable Long groupId,
            @PathVariable Long settlementId
    ) {
        SettlementProgressResponse response = settlementService.confirmSent(groupId, settlementId);
        return ResponseEntity.ok(ApiResponse.success("Transfer marked as sent.", response));
    }

    // 수취인 본인이 입금 수령을 확인하면 개별 송금이 최종 완료된다.
    @RequiredGroupMember
    @PatchMapping("/{settlementId}/complete")
    @Operation(summary = "입금 수령 확인")
    public ResponseEntity<ApiResponse<SettlementProgressResponse>> confirmReceived(
            @PathVariable Long groupId,
            @PathVariable Long settlementId
    ) {
        SettlementProgressResponse response = settlementService.confirmReceived(groupId, settlementId);
        return ResponseEntity.ok(ApiResponse.success("Transfer completed.", response));
    }
}
