package com.enjoytrip.backend.domain.expense.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotNull;

// FR-EXPENSE-01: 비율 또는 직접 금액 분담에서 참여자별 입력값을 전달한다.
@Schema(description = "비율/직접 금액 분담 상세")
public record ExpenseSplitRequest(
        @Schema(description = "분담 참여자 사용자 ID", example = "2")
        @NotNull
        Long participantId,

        @Schema(description = "RATIO 방식의 정수 비율(%). 합계는 100이어야 한다.", example = "40")
        Integer ratio,

        @Schema(description = "AMOUNT 방식의 직접 부담 금액(원). 합계는 총 지출액과 같아야 한다.", example = "5000")
        Long amount
) {
}
