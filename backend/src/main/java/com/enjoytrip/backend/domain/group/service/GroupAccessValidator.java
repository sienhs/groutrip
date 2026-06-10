package com.enjoytrip.backend.domain.group.service;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.enjoytrip.backend.domain.group.entity.GroupMember;
import com.enjoytrip.backend.domain.group.repository.GroupMemberRepository;
import com.enjoytrip.backend.global.exception.BusinessException;
import com.enjoytrip.backend.global.exception.ErrorCode;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class GroupAccessValidator {

    private final GroupMemberRepository groupMemberRepository;

    // 그룹 멤버 권한이 필요한 모든 기능에서 공통으로 사용하는 멤버십 검증 로직이다.
    public GroupMember validateMember(Long groupId, Long userId) {
        return groupMemberRepository.findByTravelGroupIdAndUserIdAndLeftAtIsNull(groupId, userId)
                .orElseThrow(() -> new BusinessException(ErrorCode.GROUP_MEMBER_NOT_FOUND));
    }

    // Owner 전용 기능은 먼저 멤버인지 확인한 뒤 role이 OWNER인지 검사한다.
    public void validateOwner(Long groupId, Long userId) {
        GroupMember member = validateMember(groupId, userId);
        if (!member.isOwner()) {
            throw new BusinessException(ErrorCode.GROUP_OWNER_REQUIRED);
        }
    }
}
