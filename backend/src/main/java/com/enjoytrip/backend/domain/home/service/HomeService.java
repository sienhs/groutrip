package com.enjoytrip.backend.domain.home.service;

import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.Comparator;
import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.enjoytrip.backend.domain.auth.entity.User;
import com.enjoytrip.backend.domain.group.entity.GroupMember;
import com.enjoytrip.backend.domain.group.entity.GroupStatus;
import com.enjoytrip.backend.domain.group.entity.TravelGroup;
import com.enjoytrip.backend.domain.group.repository.GroupMemberRepository;
import com.enjoytrip.backend.domain.group.service.CurrentUserResolver;
import com.enjoytrip.backend.domain.home.dto.GroupCard;
import com.enjoytrip.backend.domain.home.dto.HomeResponse;
import com.enjoytrip.backend.domain.home.dto.HomeResponse.Notification;
import com.enjoytrip.backend.domain.settlement.dto.SettlementTransferResponse;
import com.enjoytrip.backend.domain.settlement.service.SettlementService;
import com.enjoytrip.backend.domain.vote.entity.VoteStatus;
import com.enjoytrip.backend.domain.vote.repository.VoteSessionRepository;

import lombok.RequiredArgsConstructor;

/**
 * FR-HOME-01~03: 홈 대시보드 집계. 내가 멤버인 그룹을 상태별로 묶고, 미정산 금액·진행 중 투표 수를 요약한다.
 */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class HomeService {

    private final GroupMemberRepository groupMemberRepository;
    private final CurrentUserResolver currentUserResolver;
    private final SettlementService settlementService;
    private final VoteSessionRepository voteSessionRepository;

    public HomeResponse getHome() {
        User user = currentUserResolver.getCurrentUser();
        LocalDate today = LocalDate.now();

        // 내가 활성 멤버이고 삭제되지 않은 그룹만 대상으로 한다.
        List<TravelGroup> groups = groupMemberRepository.findByUserIdAndLeftAtIsNull(user.getId()).stream()
                .map(GroupMember::getTravelGroup)
                .filter(group -> group.getDeletedAt() == null)
                .toList();

        List<GroupCard> cards = groups.stream().map(group -> toCard(group, today)).toList();

        // 진행 중 → 가까운 예정 → 최근 완료 순으로 정렬해 내려준다(FR-GROUP-02 정렬 정책 준용).
        List<GroupCard> inProgress = cards.stream()
                .filter(card -> card.status() == GroupStatus.IN_PROGRESS)
                .sorted(Comparator.comparing(GroupCard::endDate))
                .toList();
        List<GroupCard> upcoming = cards.stream()
                .filter(card -> card.status() == GroupStatus.PLANNING)
                .sorted(Comparator.comparingLong(GroupCard::dday))
                .toList();
        List<GroupCard> completed = cards.stream()
                .filter(card -> card.status() == GroupStatus.COMPLETED)
                .sorted(Comparator.comparing(GroupCard::endDate).reversed())
                .toList();

        Notification notification = new Notification(
                unsettledAmount(groups, user.getId()),
                pendingVoteCount(groups));
        return new HomeResponse(user.getName(), inProgress, upcoming, completed, notification);
    }

    private GroupCard toCard(TravelGroup group, LocalDate today) {
        GroupStatus status = GroupStatus.fromDates(group.getStartDate(), group.getEndDate(), today);
        long dday = ChronoUnit.DAYS.between(today, group.getStartDate());
        int memberCount = (int) groupMemberRepository.countByTravelGroupIdAndLeftAtIsNull(group.getId());
        return new GroupCard(group.getId(), group.getTitle(), group.getDestination(),
                group.getStartDate(), group.getEndDate(), status, dday, memberCount, group.getCoverImageKey());
    }

    // FR-HOME-02: 그룹별 최소 송금 목록에서 내가 보낼 금액을 합산한다(Part B 정산 서비스 재사용).
    private long unsettledAmount(List<TravelGroup> groups, Long userId) {
        long total = 0;
        for (TravelGroup group : groups) {
            total += settlementService.calculate(group.getId()).transfers().stream()
                    .filter(transfer -> transfer.fromUserId().equals(userId))
                    .mapToLong(SettlementTransferResponse::amount)
                    .sum();
        }
        return total;
    }

    private long pendingVoteCount(List<TravelGroup> groups) {
        List<Long> groupIds = groups.stream().map(TravelGroup::getId).toList();
        if (groupIds.isEmpty()) {
            return 0;
        }
        return voteSessionRepository.countByTravelGroupIdInAndStatus(groupIds, VoteStatus.OPEN);
    }
}
