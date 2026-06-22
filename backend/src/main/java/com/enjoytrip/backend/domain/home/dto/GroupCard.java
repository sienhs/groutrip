package com.enjoytrip.backend.domain.home.dto;

import java.time.LocalDate;

import com.enjoytrip.backend.domain.group.entity.GroupStatus;

/**
 * FR-HOME-01: 홈/마이페이지 그룹 카드. status는 날짜 기준 실시간 계산값, dday는 시작일까지 남은 일수다.
 */
public record GroupCard(
        Long id,
        String title,
        String destination,
        LocalDate startDate,
        LocalDate endDate,
        GroupStatus status,
        long dday,          // 시작일까지 남은 일수(음수면 이미 시작/종료)
        int memberCount,
        String coverImageKey
) {
}
