package com.enjoytrip.backend.domain.group.entity;

import java.time.LocalDate;

public enum GroupStatus {
    PLANNING,
    IN_PROGRESS,
    COMPLETED,
    DELETED;

    // 8.1 그룹 상태 전이 규칙: 시작 전은 예정, 여행 기간 중은 진행 중, 종료 후는 완료이다.
    public static GroupStatus fromDates(LocalDate startDate, LocalDate endDate, LocalDate today) {
        if (today.isBefore(startDate)) {
            return PLANNING;
        }
        if (!today.isAfter(endDate)) {
            return IN_PROGRESS;
        }
        return COMPLETED;
    }
}
