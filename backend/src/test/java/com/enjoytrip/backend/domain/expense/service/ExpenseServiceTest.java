package com.enjoytrip.backend.domain.expense.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import com.enjoytrip.backend.domain.auth.entity.User;
import com.enjoytrip.backend.domain.expense.dto.ExpenseCreateRequest;
import com.enjoytrip.backend.domain.expense.dto.ExpenseResponse;
import com.enjoytrip.backend.domain.expense.entity.Expense;
import com.enjoytrip.backend.domain.expense.entity.ExpenseCategory;
import com.enjoytrip.backend.domain.expense.entity.ExpenseSplit;
import com.enjoytrip.backend.domain.expense.entity.SplitType;
import com.enjoytrip.backend.domain.expense.repository.ExpenseRepository;
import com.enjoytrip.backend.domain.expense.repository.ExpenseSplitRepository;
import com.enjoytrip.backend.domain.group.entity.GroupMember;
import com.enjoytrip.backend.domain.group.entity.GroupRole;
import com.enjoytrip.backend.domain.group.entity.GroupStatus;
import com.enjoytrip.backend.domain.group.entity.TravelGroup;
import com.enjoytrip.backend.domain.group.repository.TravelGroupRepository;
import com.enjoytrip.backend.domain.group.service.CurrentUserResolver;
import com.enjoytrip.backend.domain.group.service.GroupAccessValidator;
import com.enjoytrip.backend.global.exception.BusinessException;
import com.enjoytrip.backend.global.exception.ErrorCode;

class ExpenseServiceTest {

    private ExpenseRepository expenseRepository;
    private ExpenseSplitRepository expenseSplitRepository;
    private TravelGroupRepository travelGroupRepository;
    private CurrentUserResolver currentUserResolver;
    private GroupAccessValidator groupAccessValidator;
    private ExpenseService expenseService;

    @BeforeEach
    void setUp() {
        expenseRepository = mock(ExpenseRepository.class);
        expenseSplitRepository = mock(ExpenseSplitRepository.class);
        travelGroupRepository = mock(TravelGroupRepository.class);
        currentUserResolver = mock(CurrentUserResolver.class);
        groupAccessValidator = mock(GroupAccessValidator.class);
        expenseService = new ExpenseService(
                expenseRepository,
                expenseSplitRepository,
                travelGroupRepository,
                currentUserResolver,
                groupAccessValidator
        );
    }

    @Test
    void createSplitsEqualAmountAndKeepsSourceScheduleId() {
        TravelGroup group = group(1L);
        User creator = user(1L, "owner");
        User participantA = creator;
        User participantB = user(2L, "member-b");
        User participantC = user(3L, "member-c");

        when(currentUserResolver.getCurrentUser()).thenReturn(creator);
        when(travelGroupRepository.findByIdAndDeletedAtIsNull(1L)).thenReturn(Optional.of(group));
        when(groupAccessValidator.validateMember(1L, 1L)).thenReturn(member(group, participantA, GroupRole.OWNER));
        when(groupAccessValidator.validateMember(1L, 2L)).thenReturn(member(group, participantB, GroupRole.MEMBER));
        when(groupAccessValidator.validateMember(1L, 3L)).thenReturn(member(group, participantC, GroupRole.MEMBER));
        when(expenseRepository.save(any(Expense.class))).thenAnswer(invocation -> {
            Expense expense = invocation.getArgument(0);
            ReflectionTestUtils.setField(expense, "id", 10L);
            return expense;
        });
        when(expenseSplitRepository.saveAll(any())).thenAnswer(invocation -> invocation.getArgument(0));

        ExpenseCreateRequest request = new ExpenseCreateRequest(
                10_000L,
                1L,
                ExpenseCategory.TRANSPORT,
                SplitType.EQUAL,
                "[auto] transport",
                LocalDate.of(2026, 7, 1),
                List.of(1L, 2L, 3L),
                42L
        );

        ExpenseResponse response = expenseService.create(1L, request);

        assertEquals(10L, response.id());
        assertEquals(42L, response.sourceScheduleId());
        assertEquals(List.of(3334L, 3333L, 3333L), response.splits().stream()
                .map(split -> split.owedAmount())
                .toList());
    }

    @Test
    void createRejectsUnsupportedSplitType() {
        TravelGroup group = group(1L);
        User creator = user(1L, "owner");

        when(currentUserResolver.getCurrentUser()).thenReturn(creator);
        when(travelGroupRepository.findByIdAndDeletedAtIsNull(1L)).thenReturn(Optional.of(group));
        when(groupAccessValidator.validateMember(1L, 1L)).thenReturn(member(group, creator, GroupRole.OWNER));
        when(expenseRepository.save(any(Expense.class))).thenAnswer(invocation -> invocation.getArgument(0));

        ExpenseCreateRequest request = new ExpenseCreateRequest(
                10_000L,
                1L,
                ExpenseCategory.MEAL,
                SplitType.RATIO,
                "meal",
                LocalDate.of(2026, 7, 1),
                List.of(1L),
                null
        );

        BusinessException exception = assertThrows(BusinessException.class, () -> expenseService.create(1L, request));

        assertEquals(ErrorCode.INVALID_INPUT, exception.getErrorCode());
    }

    private TravelGroup group(Long id) {
        TravelGroup group = TravelGroup.builder()
                .title("Trip")
                .destination("Seoul")
                .startDate(LocalDate.of(2026, 7, 1))
                .endDate(LocalDate.of(2026, 7, 3))
                .inviteCode("ABC123")
                .status(GroupStatus.PLANNING)
                .build();
        ReflectionTestUtils.setField(group, "id", id);
        return group;
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

    private GroupMember member(TravelGroup group, User user, GroupRole role) {
        GroupMember member = GroupMember.builder()
                .travelGroup(group)
                .user(user)
                .role(role)
                .build();
        ReflectionTestUtils.setField(member, "id", user.getId());
        return member;
    }
}
