package com.enjoytrip.backend.domain.group.service;

import java.time.LocalDateTime;
import java.util.List;

import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.enjoytrip.backend.domain.expense.repository.ExpenseRepository;
import com.enjoytrip.backend.domain.expense.repository.ExpenseSplitRepository;
import com.enjoytrip.backend.domain.group.entity.TravelGroup;
import com.enjoytrip.backend.domain.group.repository.GroupMemberRepository;
import com.enjoytrip.backend.domain.group.repository.TravelGroupRepository;
import com.enjoytrip.backend.domain.notification.repository.NotificationRepository;
import com.enjoytrip.backend.domain.settlement.repository.SettlementRepository;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Slf4j
@Service
@RequiredArgsConstructor
public class GroupCleanupBatchService {

    private static final int RETENTION_DAYS = 30;

    private final TravelGroupRepository travelGroupRepository;
    private final GroupMemberRepository groupMemberRepository;
    private final ExpenseRepository expenseRepository;
    private final ExpenseSplitRepository expenseSplitRepository;
    private final SettlementRepository settlementRepository;
    private final NotificationRepository notificationRepository;

    // FR-GROUP-06: 매일 새벽 보존 기간이 지난 해체 그룹과 Part B 소유 데이터를 영구 삭제한다.
    @Scheduled(cron = "0 0 1 * * *", zone = "Asia/Seoul")
    @Transactional
    public void cleanupExpiredGroupsDaily() {
        cleanupExpiredGroups(LocalDateTime.now().minusDays(RETENTION_DAYS));
    }

    @Transactional
    public int cleanupExpiredGroups(LocalDateTime threshold) {
        List<TravelGroup> expiredGroups = travelGroupRepository.findByDeletedAtLessThanEqual(threshold);
        for (TravelGroup group : expiredGroups) {
            Long groupId = group.getId();
            // Part A가 Schedule/Place/Vote 테이블을 추가하면 그룹 FK 데이터를 이 삭제 순서 앞에 연결해야 한다.
            notificationRepository.deleteByTravelGroupId(groupId);
            settlementRepository.deleteByTravelGroupId(groupId);
            expenseSplitRepository.deleteByTravelGroupId(groupId);
            expenseRepository.deleteByTravelGroupId(groupId);
            groupMemberRepository.deleteByTravelGroupId(groupId);
            travelGroupRepository.delete(group);
        }
        log.info("Expired group cleanup completed. threshold={}, count={}", threshold, expiredGroups.size());
        return expiredGroups.size();
    }
}
