package com.enjoytrip.backend.domain.home.dto;

import java.util.List;

/**
 * FR-HOME-01/02/03: 홈 대시보드. 진행/예정/완료 그룹 카드와 알림 요약을 함께 내려준다.
 * 세 목록이 모두 비어 있으면 FE가 빈 상태(HOME_EMPTY)를 표시한다.
 */
public record HomeResponse(
        String greetingName,
        List<GroupCard> inProgress,
        List<GroupCard> upcoming,
        List<GroupCard> completed,
        Notification notification
) {

    /**
     * FR-HOME-02: 알림 영역 요약.
     * unsettledAmount: 내가 보내야 할 미정산 금액 합계. pendingVoteCount: 내 그룹의 진행 중 투표 수.
     */
    public record Notification(
            long unsettledAmount,
            long pendingVoteCount
    ) {
    }
}
