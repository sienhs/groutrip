package com.enjoytrip.backend.domain.settlement.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;

import java.time.LocalDate;

import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import com.enjoytrip.backend.domain.auth.entity.User;
import com.enjoytrip.backend.domain.group.entity.GroupStatus;
import com.enjoytrip.backend.domain.group.entity.TravelGroup;
import com.enjoytrip.backend.domain.settlement.dto.SettlementPaymentLinksResponse;
import com.enjoytrip.backend.domain.settlement.entity.Settlement;

class SettlementPaymentLinkGeneratorTest {

    private final SettlementPaymentLinkGenerator generator = new SettlementPaymentLinkGenerator();

    @Test
    void generateBuildsEncodedDeepLinksWithoutExecutingPayment() {
        Settlement settlement = settlement();

        SettlementPaymentLinksResponse result = generator.generate(settlement);

        assertEquals(10L, result.settlementId());
        assertEquals(30_000L, result.amount());
        assertEquals("제주 우정 여행 정산 - 홍길동", result.memo());
        assertEquals(
                "supertoss://send?amount=30000&msg=%EC%A0%9C%EC%A3%BC%20%EC%9A%B0%EC%A0%95%20%EC%97%AC%ED%96%89%20%EC%A0%95%EC%82%B0%20-%20%ED%99%8D%EA%B8%B8%EB%8F%99",
                result.tossDeepLink()
        );
        assertEquals("kakaopay://send?amount=30000", result.kakaoPayDeepLink());
        assertFalse(result.tossDeepLink().contains(" "));
    }

    private Settlement settlement() {
        TravelGroup group = TravelGroup.builder()
                .title("제주 우정 여행")
                .destination("제주")
                .startDate(LocalDate.of(2026, 7, 1))
                .endDate(LocalDate.of(2026, 7, 3))
                .inviteCode("ABC123")
                .status(GroupStatus.PLANNING)
                .build();
        ReflectionTestUtils.setField(group, "id", 1L);

        Settlement settlement = Settlement.builder()
                .travelGroup(group)
                .fromUser(user(1L, "송금자"))
                .toUser(user(2L, "홍길동"))
                .amount(30_000L)
                .build();
        ReflectionTestUtils.setField(settlement, "id", 10L);
        return settlement;
    }

    private User user(Long id, String name) {
        User user = User.builder()
                .email("user" + id + "@test.com")
                .password("encoded")
                .name(name)
                .build();
        ReflectionTestUtils.setField(user, "id", id);
        return user;
    }
}
