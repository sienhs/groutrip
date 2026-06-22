package com.enjoytrip.backend.domain.schedule.dto;

import java.util.List;

import jakarta.validation.constraints.NotNull;

/**
 * FR-EXPENSE-07: 일정 간 이동 비용을 정산에 등록하는 요청.
 * 사용자의 명시적 액션으로만 호출되며(자동 등록 아님), 등록 후 실제 금액으로 수정 가능하다.
 */
public record TransportExpenseRequest(

        @NotNull
        Long fromScheduleId,

        @NotNull
        Long toScheduleId,

        @NotNull
        TransportCostType costType,

        @NotNull
        Long payerId,

        // 미지정 시 그룹 활성 멤버 전원이 분담한다.
        List<Long> participantIds
) {
}
