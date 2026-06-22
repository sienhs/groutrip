package com.enjoytrip.backend.domain.settlement.dto;

import java.util.List;

// FR-EXPENSE-06: 그룹의 저장된 송금 확인 현황과 전체 완료 여부를 제공한다.
public record SettlementProgressResponse(
        Long groupId,
        Boolean completed,
        List<SettlementRecordResponse> transfers
) {
}
