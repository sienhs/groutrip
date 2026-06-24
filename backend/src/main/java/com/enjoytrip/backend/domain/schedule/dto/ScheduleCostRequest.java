package com.enjoytrip.backend.domain.schedule.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;

/**
 * 일정 예상 비용 설정 요청.
 * estimatedCost가 있으면 결제자(payerId)를 지정해 정산 연동 지출(균등 분담)로 등록/수정하고,
 * null/0이면 연동 지출을 제거한다.
 */
@Schema(description = "일정 예상 비용 설정 요청")
public record ScheduleCostRequest(
        @Schema(description = "예상 비용(원). null 또는 0이면 연동 지출을 제거한다.", example = "30000")
        @Min(0) @Max(100_000_000)
        Long estimatedCost,

        @Schema(description = "결제자 사용자 ID. estimatedCost가 있으면 필수.", example = "1")
        Long payerId
) {
}
