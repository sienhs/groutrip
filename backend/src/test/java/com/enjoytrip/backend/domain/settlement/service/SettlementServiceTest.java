package com.enjoytrip.backend.domain.settlement.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import java.time.LocalDate;
import java.util.Optional;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import com.enjoytrip.backend.domain.auth.entity.User;
import com.enjoytrip.backend.domain.auth.repository.UserRepository;
import com.enjoytrip.backend.domain.expense.repository.ExpenseRepository;
import com.enjoytrip.backend.domain.expense.repository.ExpenseSplitRepository;
import com.enjoytrip.backend.domain.group.entity.GroupStatus;
import com.enjoytrip.backend.domain.group.entity.TravelGroup;
import com.enjoytrip.backend.domain.group.repository.GroupMemberRepository;
import com.enjoytrip.backend.domain.group.repository.TravelGroupRepository;
import com.enjoytrip.backend.domain.group.service.CurrentUserResolver;
import com.enjoytrip.backend.domain.group.service.GroupAccessValidator;
import com.enjoytrip.backend.domain.settlement.dto.SettlementPaymentLinksResponse;
import com.enjoytrip.backend.domain.settlement.entity.Settlement;
import com.enjoytrip.backend.domain.settlement.repository.SettlementRepository;
import com.enjoytrip.backend.global.exception.BusinessException;
import com.enjoytrip.backend.global.exception.ErrorCode;

class SettlementServiceTest {

    private SettlementRepository settlementRepository;
    private CurrentUserResolver currentUserResolver;
    private SettlementService settlementService;

    @BeforeEach
    void setUp() {
        ExpenseRepository expenseRepository = mock(ExpenseRepository.class);
        ExpenseSplitRepository expenseSplitRepository = mock(ExpenseSplitRepository.class);
        GroupMemberRepository groupMemberRepository = mock(GroupMemberRepository.class);
        TravelGroupRepository travelGroupRepository = mock(TravelGroupRepository.class);
        UserRepository userRepository = mock(UserRepository.class);
        settlementRepository = mock(SettlementRepository.class);
        currentUserResolver = mock(CurrentUserResolver.class);
        GroupAccessValidator groupAccessValidator = mock(GroupAccessValidator.class);

        settlementService = new SettlementService(
                expenseRepository,
                expenseSplitRepository,
                groupMemberRepository,
                travelGroupRepository,
                userRepository,
                settlementRepository,
                currentUserResolver,
                groupAccessValidator,
                new SettlementCalculator(),
                new SettlementPaymentLinkGenerator()
        );
    }

    @Test
    void createPaymentLinksReturnsLinksToSender() {
        Settlement settlement = settlement();
        when(currentUserResolver.getCurrentUser()).thenReturn(settlement.getFromUser());
        when(settlementRepository.findByIdAndTravelGroupId(10L, 1L)).thenReturn(Optional.of(settlement));

        SettlementPaymentLinksResponse result = settlementService.createPaymentLinks(1L, 10L);

        assertEquals(30_000L, result.amount());
        assertEquals("kakaopay://send?amount=30000", result.kakaoPayDeepLink());
    }

    @Test
    void createPaymentLinksRejectsMemberWhoIsNotSender() {
        Settlement settlement = settlement();
        when(currentUserResolver.getCurrentUser()).thenReturn(user(3L, "other-member"));
        when(settlementRepository.findByIdAndTravelGroupId(10L, 1L)).thenReturn(Optional.of(settlement));

        BusinessException exception = assertThrows(
                BusinessException.class,
                () -> settlementService.createPaymentLinks(1L, 10L)
        );

        assertEquals(ErrorCode.SETTLEMENT_CONFIRMATION_FORBIDDEN, exception.getErrorCode());
    }

    private Settlement settlement() {
        TravelGroup group = TravelGroup.builder()
                .title("Trip")
                .destination("Seoul")
                .startDate(LocalDate.of(2026, 7, 1))
                .endDate(LocalDate.of(2026, 7, 3))
                .inviteCode("ABC123")
                .status(GroupStatus.PLANNING)
                .build();
        ReflectionTestUtils.setField(group, "id", 1L);

        Settlement settlement = Settlement.builder()
                .travelGroup(group)
                .fromUser(user(1L, "sender"))
                .toUser(user(2L, "receiver"))
                .amount(30_000L)
                .build();
        ReflectionTestUtils.setField(settlement, "id", 10L);
        return settlement;
    }

    private User user(Long id, String name) {
        User user = User.builder()
                .email(name + "@test.com")
                .password("encoded")
                .name(name)
                .build();
        ReflectionTestUtils.setField(user, "id", id);
        return user;
    }
}
