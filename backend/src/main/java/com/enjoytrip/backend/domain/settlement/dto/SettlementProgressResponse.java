package com.enjoytrip.backend.domain.settlement.dto;

import java.util.List;

// FR-EXPENSE-06: 그룹의 저장된 송금 확인 현황과 전체 완료 여부를 제공한다.
// started=false 이면 아직 정산을 시작하지 않은 상태(404 대신 200으로 표현).
public record SettlementProgressResponse(
        Long groupId,
        Boolean started,
        Boolean completed,
        List<SettlementRecordResponse> transfers
) {
    /** 정산 미시작 상태(저장된 송금이 없음). */
    public static SettlementProgressResponse notStarted(Long groupId) {
        return new SettlementProgressResponse(groupId, false, false, List.of());
    }
}
