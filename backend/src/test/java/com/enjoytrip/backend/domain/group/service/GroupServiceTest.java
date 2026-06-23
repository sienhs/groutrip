package com.enjoytrip.backend.domain.group.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import java.time.LocalDate;
import java.util.List;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.test.util.ReflectionTestUtils;

import com.enjoytrip.backend.domain.auth.entity.User;
import com.enjoytrip.backend.domain.group.dto.GroupCreateRequest;
import com.enjoytrip.backend.domain.group.dto.GroupResponse;
import com.enjoytrip.backend.domain.group.entity.GroupMember;
import com.enjoytrip.backend.domain.group.entity.GroupRole;
import com.enjoytrip.backend.domain.group.entity.GroupStatus;
import com.enjoytrip.backend.domain.group.entity.TravelGroup;
import com.enjoytrip.backend.domain.group.repository.GroupMemberRepository;
import com.enjoytrip.backend.domain.group.repository.TravelGroupRepository;
import com.enjoytrip.backend.domain.group.support.InviteCodeGenerator;
import com.enjoytrip.backend.global.exception.BusinessException;
import com.enjoytrip.backend.global.exception.ErrorCode;

class GroupServiceTest {

    private GroupMemberRepository groupMemberRepository;
    private CurrentUserResolver currentUserResolver;
    private GroupService groupService;

    @BeforeEach
    void setUp() {
        TravelGroupRepository travelGroupRepository = mock(TravelGroupRepository.class);
        groupMemberRepository = mock(GroupMemberRepository.class);
        InviteCodeGenerator inviteCodeGenerator = mock(InviteCodeGenerator.class);
        currentUserResolver = mock(CurrentUserResolver.class);
        GroupAccessValidator groupAccessValidator = mock(GroupAccessValidator.class);

        groupService = new GroupService(
                travelGroupRepository,
                groupMemberRepository,
                inviteCodeGenerator,
                currentUserResolver,
                groupAccessValidator,
                mock(ApplicationEventPublisher.class),
                mock(com.enjoytrip.backend.global.storage.ObjectStorageService.class)
        );
    }

    @Test
    void findMyGroupsSortsByStatusAndRelevantDate() {
        User user = user(1L);
        TravelGroup completedOld = group(1L, GroupStatus.COMPLETED, "완료-이전",
                LocalDate.of(2026, 5, 1), LocalDate.of(2026, 5, 3));
        TravelGroup planningLater = group(2L, GroupStatus.PLANNING, "예정-나중",
                LocalDate.of(2026, 8, 1), LocalDate.of(2026, 8, 3));
        TravelGroup inProgressLater = group(3L, GroupStatus.IN_PROGRESS, "진행-종료임박아님",
                LocalDate.of(2026, 6, 20), LocalDate.of(2026, 6, 28));
        TravelGroup completedRecent = group(4L, GroupStatus.COMPLETED, "완료-최근",
                LocalDate.of(2026, 6, 1), LocalDate.of(2026, 6, 3));
        TravelGroup planningSoon = group(5L, GroupStatus.PLANNING, "예정-가까움",
                LocalDate.of(2026, 7, 1), LocalDate.of(2026, 7, 3));
        TravelGroup inProgressSoon = group(6L, GroupStatus.IN_PROGRESS, "진행-종료임박",
                LocalDate.of(2026, 6, 21), LocalDate.of(2026, 6, 24));

        when(currentUserResolver.getCurrentUser()).thenReturn(user);
        when(groupMemberRepository.findByUserIdAndLeftAtIsNull(1L)).thenReturn(List.of(
                member(completedOld, user),
                member(planningLater, user),
                member(inProgressLater, user),
                member(completedRecent, user),
                member(planningSoon, user),
                member(inProgressSoon, user)
        ));

        List<GroupResponse> result = groupService.findMyGroups();

        assertEquals(
                List.of(
                        "진행-종료임박",
                        "진행-종료임박아님",
                        "예정-가까움",
                        "예정-나중",
                        "완료-최근",
                        "완료-이전"
                ),
                result.stream().map(GroupResponse::title).toList()
        );
    }

    @Test
    void findMyGroupsExcludesSoftDeletedGroups() {
        User user = user(1L);
        TravelGroup active = group(1L, GroupStatus.PLANNING, "활성 그룹",
                LocalDate.of(2026, 7, 1), LocalDate.of(2026, 7, 3));
        TravelGroup deleted = group(2L, GroupStatus.DELETED, "삭제 그룹",
                LocalDate.of(2026, 8, 1), LocalDate.of(2026, 8, 3));
        deleted.softDelete();

        when(currentUserResolver.getCurrentUser()).thenReturn(user);
        when(groupMemberRepository.findByUserIdAndLeftAtIsNull(1L)).thenReturn(List.of(
                member(deleted, user),
                member(active, user)
        ));

        List<GroupResponse> result = groupService.findMyGroups();

        assertEquals(List.of("활성 그룹"), result.stream().map(GroupResponse::title).toList());
    }

    @Test
    void createRejectsTripLongerThanThirtyDays() {
        GroupCreateRequest request = new GroupCreateRequest(
                "장기 여행",
                "서울",
                LocalDate.of(2026, 7, 1),
                LocalDate.of(2026, 7, 31),
                "cover-01"
        );

        BusinessException exception = assertThrows(BusinessException.class, () -> groupService.create(request));

        assertEquals(ErrorCode.INVALID_INPUT, exception.getErrorCode());
    }

    private User user(Long id) {
        User user = User.builder()
                .email("user" + id + "@test.com")
                .password("encoded")
                .name("사용자" + id)
                .build();
        ReflectionTestUtils.setField(user, "id", id);
        return user;
    }

    private TravelGroup group(
            Long id,
            GroupStatus status,
            String title,
            LocalDate startDate,
            LocalDate endDate
    ) {
        TravelGroup group = TravelGroup.builder()
                .title(title)
                .destination("서울")
                .startDate(startDate)
                .endDate(endDate)
                .inviteCode("CODE" + id)
                .status(status)
                .build();
        ReflectionTestUtils.setField(group, "id", id);
        return group;
    }

    private GroupMember member(TravelGroup group, User user) {
        return GroupMember.builder()
                .travelGroup(group)
                .user(user)
                .role(GroupRole.MEMBER)
                .build();
    }
}
