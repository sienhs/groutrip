package com.enjoytrip.backend.domain.group.dto;

import java.time.LocalDateTime;

import com.enjoytrip.backend.domain.group.entity.GroupMember;
import com.enjoytrip.backend.domain.group.entity.GroupRole;

// FR-GROUP-05: 그룹 멤버 목록에서 Part B가 직접 제공할 수 있는 멤버 기본 정보 응답이다.
public record GroupMemberResponse(
        Long memberId,
        Long userId,
        String name,
        GroupRole role,
        LocalDateTime joinedAt
) {
    public static GroupMemberResponse from(GroupMember member) {
        return new GroupMemberResponse(
                member.getId(),
                member.getUser().getId(),
                member.getUser().getName(),
                member.getRole(),
                member.getJoinedAt()
        );
    }
}
