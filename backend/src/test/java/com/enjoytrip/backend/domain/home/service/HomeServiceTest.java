package com.enjoytrip.backend.domain.home.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import java.time.LocalDate;
import java.util.List;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import com.enjoytrip.backend.domain.auth.entity.User;
import com.enjoytrip.backend.domain.group.entity.GroupMember;
import com.enjoytrip.backend.domain.group.entity.GroupRole;
import com.enjoytrip.backend.domain.group.entity.GroupStatus;
import com.enjoytrip.backend.domain.group.entity.TravelGroup;
import com.enjoytrip.backend.domain.group.repository.GroupMemberRepository;
import com.enjoytrip.backend.domain.group.service.CurrentUserResolver;
import com.enjoytrip.backend.domain.home.dto.HomeResponse;
import com.enjoytrip.backend.domain.settlement.dto.SettlementSummaryResponse;
import com.enjoytrip.backend.domain.settlement.dto.SettlementTransferResponse;
import com.enjoytrip.backend.domain.settlement.service.SettlementService;
import com.enjoytrip.backend.domain.vote.entity.VoteStatus;
import com.enjoytrip.backend.domain.vote.repository.VoteSessionRepository;

class HomeServiceTest {

    private GroupMemberRepository groupMemberRepository;
    private CurrentUserResolver currentUserResolver;
    private SettlementService settlementService;
    private VoteSessionRepository voteSessionRepository;
    private HomeService homeService;

    @BeforeEach
    void setUp() {
        groupMemberRepository = mock(GroupMemberRepository.class);
        currentUserResolver = mock(CurrentUserResolver.class);
        settlementService = mock(SettlementService.class);
        voteSessionRepository = mock(VoteSessionRepository.class);
        homeService = new HomeService(
                groupMemberRepository, currentUserResolver, settlementService, voteSessionRepository);
    }

    @Test
    void aggregatesGroupsByStatusAndSummarizesNotifications() {
        User user = user();
        LocalDate today = LocalDate.now();
        TravelGroup upcoming = group(1L, today.plusDays(10), today.plusDays(12));
        TravelGroup inProgress = group(2L, today.minusDays(1), today.plusDays(1));
        TravelGroup completed = group(3L, today.minusDays(10), today.minusDays(5));

        when(currentUserResolver.getCurrentUser()).thenReturn(user);
        when(groupMemberRepository.findByUserIdAndLeftAtIsNull(1L)).thenReturn(List.of(
                member(upcoming, user), member(inProgress, user), member(completed, user)));
        when(groupMemberRepository.countByTravelGroupIdAndLeftAtIsNull(anyLong())).thenReturn(3L);
        // 그룹마다 내가 보낼 송금 1000원 → 합계 3000
        when(settlementService.calculate(anyLong())).thenReturn(summaryWithMyTransfer(1L, 1000L));
        when(voteSessionRepository.countByTravelGroupIdInAndStatus(anyList(), eq(VoteStatus.OPEN))).thenReturn(2L);

        HomeResponse response = homeService.getHome();

        assertThat(response.greetingName()).isEqualTo("user1");
        assertThat(response.inProgress()).extracting(c -> c.status()).containsExactly(GroupStatus.IN_PROGRESS);
        assertThat(response.upcoming()).extracting(c -> c.id()).containsExactly(1L);
        assertThat(response.completed()).extracting(c -> c.id()).containsExactly(3L);
        assertThat(response.notification().unsettledAmount()).isEqualTo(3000L);
        assertThat(response.notification().pendingVoteCount()).isEqualTo(2L);
    }

    @Test
    void excludesDeletedGroups() {
        User user = user();
        LocalDate today = LocalDate.now();
        TravelGroup active = group(1L, today.plusDays(5), today.plusDays(7));
        TravelGroup deleted = group(2L, today.plusDays(5), today.plusDays(7));
        ReflectionTestUtils.setField(deleted, "deletedAt", java.time.LocalDateTime.now());

        when(currentUserResolver.getCurrentUser()).thenReturn(user);
        when(groupMemberRepository.findByUserIdAndLeftAtIsNull(1L)).thenReturn(List.of(
                member(active, user), member(deleted, user)));
        when(groupMemberRepository.countByTravelGroupIdAndLeftAtIsNull(anyLong())).thenReturn(2L);
        when(settlementService.calculate(anyLong())).thenReturn(summaryWithMyTransfer(1L, 0L));
        when(voteSessionRepository.countByTravelGroupIdInAndStatus(anyList(), eq(VoteStatus.OPEN))).thenReturn(0L);

        HomeResponse response = homeService.getHome();

        assertThat(response.upcoming()).extracting(c -> c.id()).containsExactly(1L); // 삭제 그룹 제외
    }

    // --- helpers ---

    private User user() {
        User user = User.builder().email("u1@test.com").password("enc").name("user1").build();
        ReflectionTestUtils.setField(user, "id", 1L);
        return user;
    }

    private TravelGroup group(Long id, LocalDate start, LocalDate end) {
        TravelGroup group = TravelGroup.builder()
                .title("Trip" + id).destination("서울특별시")
                .startDate(start).endDate(end)
                .inviteCode("ABC12" + id).status(GroupStatus.PLANNING)
                .build();
        ReflectionTestUtils.setField(group, "id", id);
        return group;
    }

    private GroupMember member(TravelGroup group, User user) {
        GroupMember member = GroupMember.builder().travelGroup(group).user(user).role(GroupRole.MEMBER).build();
        ReflectionTestUtils.setField(member, "id", group.getId());
        return member;
    }

    private SettlementSummaryResponse summaryWithMyTransfer(Long myId, Long amount) {
        List<SettlementTransferResponse> transfers = amount == 0
                ? List.of()
                : List.of(new SettlementTransferResponse(myId, "me", 99L, "other", amount));
        return new SettlementSummaryResponse(1L, 0L, 0L, List.of(), transfers);
    }
}
