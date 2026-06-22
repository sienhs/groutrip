package com.enjoytrip.backend.domain.group.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.inOrder;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import java.time.LocalDateTime;
import java.util.List;

import org.junit.jupiter.api.Test;
import org.mockito.InOrder;

import com.enjoytrip.backend.domain.expense.repository.ExpenseRepository;
import com.enjoytrip.backend.domain.expense.repository.ExpenseSplitRepository;
import com.enjoytrip.backend.domain.group.entity.TravelGroup;
import com.enjoytrip.backend.domain.group.repository.GroupMemberRepository;
import com.enjoytrip.backend.domain.group.repository.TravelGroupRepository;
import com.enjoytrip.backend.domain.notification.repository.NotificationRepository;
import com.enjoytrip.backend.domain.settlement.repository.SettlementRepository;

class GroupCleanupBatchServiceTest {

    @Test
    void deletesExpiredGroupDataInForeignKeyOrder() {
        TravelGroupRepository groupRepository = mock(TravelGroupRepository.class);
        GroupMemberRepository memberRepository = mock(GroupMemberRepository.class);
        ExpenseRepository expenseRepository = mock(ExpenseRepository.class);
        ExpenseSplitRepository splitRepository = mock(ExpenseSplitRepository.class);
        SettlementRepository settlementRepository = mock(SettlementRepository.class);
        NotificationRepository notificationRepository = mock(NotificationRepository.class);
        GroupCleanupBatchService service = new GroupCleanupBatchService(
                groupRepository,
                memberRepository,
                expenseRepository,
                splitRepository,
                settlementRepository,
                notificationRepository
        );
        TravelGroup group = mock(TravelGroup.class);
        when(group.getId()).thenReturn(7L);
        LocalDateTime threshold = LocalDateTime.of(2026, 6, 1, 0, 0);
        when(groupRepository.findByDeletedAtLessThanEqual(threshold)).thenReturn(List.of(group));

        int deletedCount = service.cleanupExpiredGroups(threshold);

        assertEquals(1, deletedCount);
        InOrder order = inOrder(
                notificationRepository,
                settlementRepository,
                splitRepository,
                expenseRepository,
                memberRepository,
                groupRepository
        );
        order.verify(notificationRepository).deleteByTravelGroupId(7L);
        order.verify(settlementRepository).deleteByTravelGroupId(7L);
        order.verify(splitRepository).deleteByTravelGroupId(7L);
        order.verify(expenseRepository).deleteByTravelGroupId(7L);
        order.verify(memberRepository).deleteByTravelGroupId(7L);
        order.verify(groupRepository).delete(group);
    }
}
