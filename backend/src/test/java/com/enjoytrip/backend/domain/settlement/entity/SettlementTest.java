package com.enjoytrip.backend.domain.settlement.entity;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;

import java.time.LocalDate;

import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import com.enjoytrip.backend.domain.auth.entity.User;
import com.enjoytrip.backend.domain.group.entity.GroupStatus;
import com.enjoytrip.backend.domain.group.entity.TravelGroup;
import com.enjoytrip.backend.global.exception.BusinessException;
import com.enjoytrip.backend.global.exception.ErrorCode;

class SettlementTest {

    @Test
    void senderAndReceiverConfirmInOrder() {
        Settlement settlement = settlement();

        settlement.confirmSent(1L);
        assertEquals(SettlementStatus.SENT, settlement.getStatus());
        assertNotNull(settlement.getSenderConfirmedAt());

        settlement.confirmReceived(2L);
        assertEquals(SettlementStatus.COMPLETED, settlement.getStatus());
        assertNotNull(settlement.getReceiverConfirmedAt());
    }

    @Test
    void memberCannotConfirmAnotherUsersTransfer() {
        Settlement settlement = settlement();

        BusinessException exception = assertThrows(
                BusinessException.class,
                () -> settlement.confirmSent(3L)
        );

        assertEquals(ErrorCode.SETTLEMENT_CONFIRMATION_FORBIDDEN, exception.getErrorCode());
        assertEquals(SettlementStatus.PENDING, settlement.getStatus());
    }

    @Test
    void receiverCannotCompletePendingTransfer() {
        Settlement settlement = settlement();

        BusinessException exception = assertThrows(
                BusinessException.class,
                () -> settlement.confirmReceived(2L)
        );

        assertEquals(ErrorCode.SETTLEMENT_INVALID_STATUS, exception.getErrorCode());
        assertEquals(SettlementStatus.PENDING, settlement.getStatus());
    }

    @Test
    void completedTransitionCannotBeRepeated() {
        Settlement settlement = settlement();
        settlement.confirmSent(1L);

        BusinessException exception = assertThrows(
                BusinessException.class,
                () -> settlement.confirmSent(1L)
        );

        assertEquals(ErrorCode.SETTLEMENT_INVALID_STATUS, exception.getErrorCode());
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

        return Settlement.builder()
                .travelGroup(group)
                .fromUser(user(1L, "sender"))
                .toUser(user(2L, "receiver"))
                .amount(30_000L)
                .build();
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
