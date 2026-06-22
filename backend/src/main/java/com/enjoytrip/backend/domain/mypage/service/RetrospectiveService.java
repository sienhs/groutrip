package com.enjoytrip.backend.domain.mypage.service;

import java.time.LocalDate;
import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.enjoytrip.backend.domain.auth.entity.User;
import com.enjoytrip.backend.domain.group.entity.GroupStatus;
import com.enjoytrip.backend.domain.group.entity.TravelGroup;
import com.enjoytrip.backend.domain.group.repository.TravelGroupRepository;
import com.enjoytrip.backend.domain.group.service.CurrentUserResolver;
import com.enjoytrip.backend.domain.group.service.GroupAccessValidator;
import com.enjoytrip.backend.domain.mypage.dto.RetrospectiveRequest;
import com.enjoytrip.backend.domain.mypage.dto.RetrospectiveResponse;
import com.enjoytrip.backend.domain.mypage.entity.Retrospective;
import com.enjoytrip.backend.domain.mypage.repository.RetrospectiveRepository;
import com.enjoytrip.backend.global.exception.BusinessException;
import com.enjoytrip.backend.global.exception.ErrorCode;

import lombok.RequiredArgsConstructor;

/**
 * FR-MYPAGE-04: 여행 회고. 종료된 그룹에 대해 본인만 한 줄 후기 + 별점을 남기고 조회한다.
 */
@Service
@RequiredArgsConstructor
@Transactional
public class RetrospectiveService {

    private final RetrospectiveRepository retrospectiveRepository;
    private final TravelGroupRepository travelGroupRepository;
    private final CurrentUserResolver currentUserResolver;
    private final GroupAccessValidator groupAccessValidator;

    /**
     * FR-MYPAGE-04: 회고 작성/수정(그룹·사용자당 1건). 종료된 그룹에만 작성할 수 있다.
     */
    public RetrospectiveResponse upsert(Long groupId, RetrospectiveRequest request) {
        User user = currentUserResolver.getCurrentUser();
        groupAccessValidator.validateMember(groupId, user.getId());
        TravelGroup group = travelGroupRepository.findByIdAndDeletedAtIsNull(groupId)
                .orElseThrow(() -> new BusinessException(ErrorCode.GROUP_NOT_FOUND));

        if (GroupStatus.fromDates(group.getStartDate(), group.getEndDate(), LocalDate.now()) != GroupStatus.COMPLETED) {
            throw new BusinessException(ErrorCode.INVALID_INPUT); // 종료된 그룹만 회고 가능
        }

        Retrospective retrospective = retrospectiveRepository.findByTravelGroupIdAndUserId(groupId, user.getId())
                .map(existing -> {
                    existing.update(request.content(), request.rating());
                    return existing;
                })
                .orElseGet(() -> retrospectiveRepository.save(Retrospective.builder()
                        .travelGroup(group)
                        .user(user)
                        .content(request.content())
                        .rating(request.rating())
                        .build()));
        return RetrospectiveResponse.from(retrospective);
    }

    /**
     * FR-MYPAGE-04: 특정 그룹에 대한 내 회고 조회.
     */
    @Transactional(readOnly = true)
    public RetrospectiveResponse getMine(Long groupId) {
        User user = currentUserResolver.getCurrentUser();
        groupAccessValidator.validateMember(groupId, user.getId());
        return retrospectiveRepository.findByTravelGroupIdAndUserId(groupId, user.getId())
                .map(RetrospectiveResponse::from)
                .orElseThrow(() -> new BusinessException(ErrorCode.NOT_FOUND));
    }

    /**
     * FR-MYPAGE-04: 내 여행 기록(회고) 모음. 본인 것만 조회한다.
     */
    @Transactional(readOnly = true)
    public List<RetrospectiveResponse> listMine() {
        User user = currentUserResolver.getCurrentUser();
        return retrospectiveRepository.findByUserIdOrderByCreatedAtDesc(user.getId()).stream()
                .map(RetrospectiveResponse::from)
                .toList();
    }
}
