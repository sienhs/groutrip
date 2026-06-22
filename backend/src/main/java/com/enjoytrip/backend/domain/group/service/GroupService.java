package com.enjoytrip.backend.domain.group.service;

import java.time.LocalDate;
import java.util.Comparator;
import java.util.List;
import java.util.Map;

import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.enjoytrip.backend.domain.auth.entity.User;
import com.enjoytrip.backend.domain.group.dto.GroupCreateRequest;
import com.enjoytrip.backend.domain.group.dto.GroupMemberResponse;
import com.enjoytrip.backend.domain.group.dto.GroupResponse;
import com.enjoytrip.backend.domain.group.dto.GroupUpdateRequest;
import com.enjoytrip.backend.domain.group.entity.GroupMember;
import com.enjoytrip.backend.domain.group.entity.GroupRole;
import com.enjoytrip.backend.domain.group.entity.GroupStatus;
import com.enjoytrip.backend.domain.group.entity.TravelGroup;
import com.enjoytrip.backend.domain.group.repository.GroupMemberRepository;
import com.enjoytrip.backend.domain.group.repository.TravelGroupRepository;
import com.enjoytrip.backend.domain.group.support.InviteCodeGenerator;
import com.enjoytrip.backend.global.exception.BusinessException;
import com.enjoytrip.backend.global.exception.ErrorCode;
import com.enjoytrip.backend.global.event.DomainEvent;
import com.enjoytrip.backend.global.event.EventType;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
@Transactional
public class GroupService {

    private static final int MAX_MEMBER_COUNT = 8;
    private static final int MAX_INVITE_CODE_RETRY = 10;
    private static final int MAX_TRIP_DAYS = 30;

    private final TravelGroupRepository travelGroupRepository;
    private final GroupMemberRepository groupMemberRepository;
    private final InviteCodeGenerator inviteCodeGenerator;
    private final CurrentUserResolver currentUserResolver;
    private final GroupAccessValidator groupAccessValidator;
    private final ApplicationEventPublisher eventPublisher;

    // FR-GROUP-01: 그룹을 생성하고 생성자를 자동으로 Owner 멤버로 등록한다.
    public GroupResponse create(GroupCreateRequest request) {
        validateDateRange(request.startDate(), request.endDate());

        User owner = currentUserResolver.getCurrentUser();
        TravelGroup group = TravelGroup.builder()
                .title(request.title())
                .destination(request.destination())
                .startDate(request.startDate())
                .endDate(request.endDate())
                .coverImageKey(request.coverImageKey())
                .inviteCode(generateUniqueInviteCode())
                .status(GroupStatus.fromDates(request.startDate(), request.endDate(), LocalDate.now()))
                .build();

        TravelGroup savedGroup = travelGroupRepository.save(group);
        groupMemberRepository.save(GroupMember.builder()
                .travelGroup(savedGroup)
                .user(owner)
                .role(GroupRole.OWNER)
                .build());

        return GroupResponse.from(savedGroup);
    }

    // FR-GROUP-03: 초대코드로 그룹에 참여한다. 중복 참여와 최대 8명 제한을 함께 검증한다.
    public GroupResponse joinByInviteCode(String inviteCode) {
        User user = currentUserResolver.getCurrentUser();
        TravelGroup group = travelGroupRepository.findByInviteCodeAndDeletedAtIsNull(inviteCode)
                .orElseThrow(() -> new BusinessException(ErrorCode.INVALID_INVITE_CODE));

        if (groupMemberRepository.existsByTravelGroupIdAndUserIdAndLeftAtIsNull(group.getId(), user.getId())) {
            throw new BusinessException(ErrorCode.DUPLICATE_GROUP_MEMBER);
        }

        if (groupMemberRepository.countByTravelGroupIdAndLeftAtIsNull(group.getId()) >= MAX_MEMBER_COUNT) {
            throw new BusinessException(ErrorCode.GROUP_FULL);
        }

        groupMemberRepository.save(GroupMember.builder()
                .travelGroup(group)
                .user(user)
                .role(GroupRole.MEMBER)
                .build());

        publish(EventType.MEMBER_JOINED, group.getId(), user.getId(), Map.of("userId", user.getId()));
        return GroupResponse.from(group);
    }

    /**
     * FR-GROUP-02: 내가 속한 그룹 목록 조회.
     * 상태값은 조회 시 재계산하지 않고 GroupStatusBatchService가 갱신한 값을 사용한다.
     */
    @Transactional(readOnly = true)
    public List<GroupResponse> findMyGroups() {
        User user = currentUserResolver.getCurrentUser();
        List<GroupMember> memberships = groupMemberRepository.findByUserIdAndLeftAtIsNull(user.getId());

        return sortMyGroups(memberships).stream()
                .map(GroupResponse::from)
                .toList();
    }

    /**
     * FR-GROUP-02: 그룹 상세 조회.
     * 그룹 멤버만 삭제되지 않은 그룹의 기본 정보를 조회할 수 있다.
     */
    @Transactional(readOnly = true)
    public GroupResponse findGroupDetail(Long groupId) {
        User user = currentUserResolver.getCurrentUser();
        groupAccessValidator.validateMember(groupId, user.getId());

        TravelGroup group = travelGroupRepository.findByIdAndDeletedAtIsNull(groupId)
                .orElseThrow(() -> new BusinessException(ErrorCode.GROUP_NOT_FOUND));
        return GroupResponse.from(group);
    }

    /**
     * FR-GROUP-04: 그룹 정보 수정.
     * Owner만 기본 정보를 수정할 수 있고, 날짜 변경 규칙을 함께 검증한다.
     */
    public GroupResponse updateGroupInfo(Long groupId, GroupUpdateRequest request) {
        User user = currentUserResolver.getCurrentUser();
        groupAccessValidator.validateOwner(groupId, user.getId());

        TravelGroup group = travelGroupRepository.findByIdAndDeletedAtIsNull(groupId)
                .orElseThrow(() -> new BusinessException(ErrorCode.GROUP_NOT_FOUND));
        validateUpdateDateRange(group, request);

        group.updateInfo(
                request.title(),
                request.destination(),
                request.startDate(),
                request.endDate(),
                request.coverImageKey()
        );
        group.updateStatus(LocalDate.now());

        GroupResponse response = GroupResponse.from(group);
        publish(EventType.GROUP_UPDATED, groupId, user.getId(), response);
        return response;
    }

    /**
     * FR-GROUP-05: 그룹 멤버 목록 조회.
     * 그룹 멤버만 현재 활성 멤버 목록을 확인할 수 있다.
     */
    @Transactional(readOnly = true)
    public List<GroupMemberResponse> findGroupMembers(Long groupId) {
        User user = currentUserResolver.getCurrentUser();
        groupAccessValidator.validateMember(groupId, user.getId());

        return groupMemberRepository.findByTravelGroupIdAndLeftAtIsNull(groupId).stream()
                .map(GroupMemberResponse::from)
                .toList();
    }

    /**
     * FR-GROUP-07: 초대코드 재발급.
     * Owner만 실행할 수 있고, 새 코드를 저장하는 순간 기존 코드는 무효가 된다.
     */
    public GroupResponse regenerateInviteCode(Long groupId) {
        User user = currentUserResolver.getCurrentUser();
        groupAccessValidator.validateOwner(groupId, user.getId());

        TravelGroup group = travelGroupRepository.findByIdAndDeletedAtIsNull(groupId)
                .orElseThrow(() -> new BusinessException(ErrorCode.GROUP_NOT_FOUND));
        group.regenerateInviteCode(generateUniqueInviteCode());

        GroupResponse response = GroupResponse.from(group);
        publish(EventType.GROUP_UPDATED, groupId, user.getId(), response);
        return response;
    }

    /**
     * FR-GROUP-05: 그룹 나가기 TODO.
     * Owner는 바로 나갈 수 없고 Owner 이전 또는 그룹 해체가 선행되어야 한다.
     */
    public void leaveGroup(Long groupId) {
        User user = currentUserResolver.getCurrentUser();
        TravelGroup group = travelGroupRepository.findByIdAndDeletedAtIsNull(groupId)
                .orElseThrow(() -> new BusinessException(ErrorCode.GROUP_NOT_FOUND));
        GroupMember member = groupAccessValidator.validateMember(group.getId(), user.getId());

        if (member.isOwner()) {
            throw new BusinessException(ErrorCode.GROUP_OWNER_CANNOT_LEAVE);
        }

        member.leave();
        publish(EventType.MEMBER_LEFT, groupId, user.getId(), Map.of("userId", user.getId()));
    }

    /**
     * FR-GROUP-05: 멤버 강퇴 TODO.
     * Owner만 실행할 수 있고, 작성 데이터는 보존하며 멤버십만 비활성화한다.
     */
    public void kickMember(Long groupId, Long targetUserId) {
        User user = currentUserResolver.getCurrentUser();
        groupAccessValidator.validateOwner(groupId, user.getId());

        TravelGroup group = travelGroupRepository.findByIdAndDeletedAtIsNull(groupId)
                .orElseThrow(() -> new BusinessException(ErrorCode.GROUP_NOT_FOUND));
        GroupMember targetMember = groupMemberRepository.findByTravelGroupIdAndUserIdAndLeftAtIsNull(
                        group.getId(),
                        targetUserId
                )
                .orElseThrow(() -> new BusinessException(ErrorCode.GROUP_MEMBER_NOT_FOUND));

        if (targetMember.isOwner()) {
            throw new BusinessException(ErrorCode.INVALID_INPUT);
        }

        targetMember.leave();
        publish(EventType.MEMBER_LEFT, groupId, user.getId(), Map.of("userId", targetUserId));
    }

    /**
     * FR-GROUP-05: Owner 이전 TODO.
     * 기존 Owner 강등과 대상 멤버 승격은 하나의 트랜잭션에서 함께 처리한다.
     */
    public void transferOwner(Long groupId, Long targetUserId) {
        User user = currentUserResolver.getCurrentUser();
        groupAccessValidator.validateOwner(groupId, user.getId());

        TravelGroup group = travelGroupRepository.findByIdAndDeletedAtIsNull(groupId)
                .orElseThrow(() -> new BusinessException(ErrorCode.GROUP_NOT_FOUND));
        GroupMember currentOwner = groupMemberRepository.findByTravelGroupIdAndUserIdAndLeftAtIsNull(
                        group.getId(),
                        user.getId()
                )
                .orElseThrow(() -> new BusinessException(ErrorCode.GROUP_MEMBER_NOT_FOUND));
        GroupMember targetMember = groupMemberRepository.findByTravelGroupIdAndUserIdAndLeftAtIsNull(
                        group.getId(),
                        targetUserId
                )
                .orElseThrow(() -> new BusinessException(ErrorCode.GROUP_MEMBER_NOT_FOUND));

        if (targetMember.isOwner()) {
            throw new BusinessException(ErrorCode.INVALID_INPUT);
        }

        currentOwner.becomeMember();
        targetMember.transferOwner();
        publish(EventType.GROUP_UPDATED, groupId, user.getId(), Map.of("ownerUserId", targetUserId));
    }

    /**
     * FR-GROUP-06: 그룹 해체 TODO.
     * Owner만 실행할 수 있고, 그룹은 soft delete 후 30일 hard delete 배치 대상으로 남긴다.
     */
    public void dissolveGroup(Long groupId) {
        User user = currentUserResolver.getCurrentUser();
        groupAccessValidator.validateOwner(groupId, user.getId());

        TravelGroup group = travelGroupRepository.findByIdAndDeletedAtIsNull(groupId)
                .orElseThrow(() -> new BusinessException(ErrorCode.GROUP_NOT_FOUND));
        group.softDelete();
        groupMemberRepository.findByTravelGroupIdAndLeftAtIsNull(group.getId())
                .forEach(GroupMember::leave);

        publish(EventType.GROUP_UPDATED, groupId, user.getId(), Map.of("deleted", true));
    }

    // FR-GROUP-01/04: 여행 시작일과 종료일의 순서 및 최대 30일 제한을 검증한다.
    private void validateDateRange(LocalDate startDate, LocalDate endDate) {
        if (startDate.isAfter(endDate)) {
            throw new BusinessException(ErrorCode.INVALID_INPUT);
        }

        if (startDate.plusDays(MAX_TRIP_DAYS - 1).isBefore(endDate)) {
            throw new BusinessException(ErrorCode.INVALID_INPUT);
        }
    }

    // FR-GROUP-04: 시작일 변경은 여행 시작 전까지만 허용하고, 종료일 단축의 일정 검사는 Schedule 계약이 생기면 연결한다.
    private void validateUpdateDateRange(TravelGroup group, GroupUpdateRequest request) {
        validateDateRange(request.startDate(), request.endDate());

        LocalDate today = LocalDate.now();
        if (!request.startDate().equals(group.getStartDate())) {
            if (!today.isBefore(group.getStartDate()) || request.startDate().isBefore(today)) {
                throw new BusinessException(ErrorCode.INVALID_INPUT);
            }
        }

        // TODO(FR-GROUP-04/FR-SCHEDULE-01): 종료일을 앞당길 때 제외되는 날짜에 일정이 있는지 Schedule 도메인 계약으로 검증한다.
    }

    // FR-GROUP-01/07: 6자리 초대코드 충돌을 피하기 위해 제한 횟수 안에서 재시도한다.
    private String generateUniqueInviteCode() {
        for (int i = 0; i < MAX_INVITE_CODE_RETRY; i++) {
            String inviteCode = inviteCodeGenerator.generate();
            if (!travelGroupRepository.existsByInviteCode(inviteCode)) {
                return inviteCode;
            }
        }
        throw new BusinessException(ErrorCode.INTERNAL_SERVER_ERROR);
    }

    // FR-GROUP-02: 내 그룹 목록은 삭제 그룹을 제외하고 진행 중, 예정, 완료 순으로 정렬한다.
    private List<TravelGroup> sortMyGroups(List<GroupMember> memberships) {
        return memberships.stream()
                .map(GroupMember::getTravelGroup)
                .filter(group -> group.getDeletedAt() == null)
                .sorted(this::compareForMyGroupList)
                .toList();
    }

    // 상태가 같을 때는 진행 중은 종료일 임박순, 예정은 시작일 임박순, 완료는 최근 종료순으로 정렬한다.
    private int compareForMyGroupList(TravelGroup left, TravelGroup right) {
        int statusCompared = Integer.compare(statusSortOrder(left.getStatus()), statusSortOrder(right.getStatus()));
        if (statusCompared != 0) {
            return statusCompared;
        }

        return switch (left.getStatus()) {
            case IN_PROGRESS -> Comparator.comparing(TravelGroup::getEndDate)
                    .compare(left, right);
            case PLANNING -> Comparator.comparing(TravelGroup::getStartDate)
                    .compare(left, right);
            case COMPLETED -> Comparator.comparing(TravelGroup::getEndDate)
                    .reversed()
                    .compare(left, right);
            case DELETED -> 0;
        };
    }

    // 목록 상단에 진행 중 그룹을 먼저 보여주기 위한 상태별 우선순위이다.
    private int statusSortOrder(GroupStatus status) {
        return switch (status) {
            case IN_PROGRESS -> 0;
            case PLANNING -> 1;
            case COMPLETED -> 2;
            case DELETED -> 3;
        };
    }

    // Part B 도메인은 공통 이벤트 계약만 발행하고 SSE 구현에는 직접 의존하지 않는다.
    private void publish(EventType type, Long groupId, Long actorId, Object payload) {
        eventPublisher.publishEvent(DomainEvent.of(type, groupId, actorId, payload));
    }
}
