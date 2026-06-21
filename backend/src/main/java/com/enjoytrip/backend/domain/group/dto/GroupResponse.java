package com.enjoytrip.backend.domain.group.dto;

import java.time.LocalDate;

import com.enjoytrip.backend.domain.group.entity.GroupStatus;
import com.enjoytrip.backend.domain.group.entity.TravelGroup;

// 그룹 생성, 참여, 목록 조회에서 공통으로 내려주는 그룹 응답 DTO이다.
public record GroupResponse(
        Long id,
        String title,
        String destination,
        LocalDate startDate,
        LocalDate endDate,
        String coverImageKey,
        String inviteCode,
        GroupStatus status
) {
    // Entity를 외부 응답 DTO로 변환해 도메인 객체 노출을 막는다.
    public static GroupResponse from(TravelGroup group) {
        return new GroupResponse(
                group.getId(),
                group.getTitle(),
                group.getDestination(),
                group.getStartDate(),
                group.getEndDate(),
                group.getCoverImageKey(),
                group.getInviteCode(),
                group.getStatus()
        );
    }
}
