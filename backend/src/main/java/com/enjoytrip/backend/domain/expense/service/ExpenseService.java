package com.enjoytrip.backend.domain.expense.service;

import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.enjoytrip.backend.domain.auth.entity.User;
import com.enjoytrip.backend.domain.expense.dto.ExpenseCreateRequest;
import com.enjoytrip.backend.domain.expense.dto.ExpenseResponse;
import com.enjoytrip.backend.domain.expense.dto.ExpenseUpdateRequest;
import com.enjoytrip.backend.domain.expense.entity.Expense;
import com.enjoytrip.backend.domain.expense.entity.ExpenseSplit;
import com.enjoytrip.backend.domain.expense.entity.SplitType;
import com.enjoytrip.backend.domain.expense.repository.ExpenseRepository;
import com.enjoytrip.backend.domain.expense.repository.ExpenseSplitRepository;
import com.enjoytrip.backend.domain.group.entity.GroupMember;
import com.enjoytrip.backend.domain.group.entity.TravelGroup;
import com.enjoytrip.backend.domain.group.repository.TravelGroupRepository;
import com.enjoytrip.backend.domain.group.service.CurrentUserResolver;
import com.enjoytrip.backend.domain.group.service.GroupAccessValidator;
import com.enjoytrip.backend.global.exception.BusinessException;
import com.enjoytrip.backend.global.exception.ErrorCode;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
@Transactional
public class ExpenseService {

    private final ExpenseRepository expenseRepository;
    private final ExpenseSplitRepository expenseSplitRepository;
    private final TravelGroupRepository travelGroupRepository;
    private final CurrentUserResolver currentUserResolver;
    private final GroupAccessValidator groupAccessValidator;

    /**
     * FR-EXPENSE-01: 지출 등록.
     * 그룹 멤버가 결제자와 참여자를 선택하면 우선 균등 분담 금액을 계산해 저장한다.
     */
    public ExpenseResponse create(Long groupId, ExpenseCreateRequest request) {
        User creator = currentUserResolver.getCurrentUser();
        groupAccessValidator.validateMember(groupId, creator.getId());

        TravelGroup group = travelGroupRepository.findByIdAndDeletedAtIsNull(groupId)
                .orElseThrow(() -> new BusinessException(ErrorCode.GROUP_NOT_FOUND));
        GroupMember payerMember = groupAccessValidator.validateMember(groupId, request.payerId());
        List<GroupMember> participantMembers = resolveParticipants(groupId, request.participantIds());

        Expense expense = Expense.builder()
                .travelGroup(group)
                .payer(payerMember.getUser())
                .createdBy(creator)
                .amount(request.amount())
                .category(request.category())
                .splitType(request.splitType())
                .description(request.description())
                .paidAt(request.paidAt())
                .sourceScheduleId(request.sourceScheduleId())
                .build();
        Expense savedExpense = expenseRepository.save(expense);

        List<ExpenseSplit> splits = createSplits(savedExpense, participantMembers);
        expenseSplitRepository.saveAll(splits);

        // TODO(FR-SSE-02): SSE 기반 동기화가 준비되면 EXPENSE_ADDED 이벤트를 발행한다.
        return ExpenseResponse.from(savedExpense, splits);
    }

    /**
     * FR-EXPENSE-02: 지출 목록 조회.
     * 그룹 멤버만 삭제되지 않은 지출을 결제일 최신순으로 확인할 수 있다.
     */
    @Transactional(readOnly = true)
    public List<ExpenseResponse> findGroupExpenses(Long groupId) {
        User user = currentUserResolver.getCurrentUser();
        groupAccessValidator.validateMember(groupId, user.getId());

        List<Expense> expenses = expenseRepository.findByTravelGroupIdAndDeletedAtIsNullOrderByPaidAtDescIdDesc(groupId);
        List<Long> expenseIds = expenses.stream()
                .map(Expense::getId)
                .toList();
        Map<Long, List<ExpenseSplit>> splitsByExpenseId = expenseIds.isEmpty()
                ? Map.of()
                : expenseSplitRepository.findByExpenseIdIn(expenseIds).stream()
                        .collect(Collectors.groupingBy(split -> split.getExpense().getId()));

        return expenses.stream()
                .map(expense -> ExpenseResponse.from(
                        expense,
                        splitsByExpenseId.getOrDefault(expense.getId(), List.of())
                ))
                .toList();
    }

    /**
     * FR-EXPENSE-03: 지출 수정.
     * 작성자 또는 그룹 Owner만 수정할 수 있고, 수정 후 분담 결과를 다시 계산한다.
     */
    public ExpenseResponse update(Long groupId, Long expenseId, ExpenseUpdateRequest request) {
        User user = currentUserResolver.getCurrentUser();
        GroupMember actorMember = groupAccessValidator.validateMember(groupId, user.getId());
        Expense expense = findActiveExpense(groupId, expenseId);
        validateWriterOrOwner(expense, actorMember, user.getId());

        GroupMember payerMember = groupAccessValidator.validateMember(groupId, request.payerId());
        List<GroupMember> participantMembers = resolveParticipants(groupId, request.participantIds());

        expense.update(
                payerMember.getUser(),
                request.amount(),
                request.category(),
                request.splitType(),
                request.description(),
                request.paidAt(),
                request.sourceScheduleId()
        );

        expenseSplitRepository.deleteByExpenseId(expense.getId());
        List<ExpenseSplit> splits = createSplits(expense, participantMembers);
        expenseSplitRepository.saveAll(splits);

        // TODO(FR-SSE-02): SSE 기반 동기화가 준비되면 EXPENSE_UPDATED 이벤트를 발행한다.
        return ExpenseResponse.from(expense, splits);
    }

    /**
     * FR-EXPENSE-03: 지출 삭제.
     * 작성자 또는 그룹 Owner만 삭제할 수 있고, 지출 기록은 soft delete로 보존한다.
     */
    public void delete(Long groupId, Long expenseId) {
        User user = currentUserResolver.getCurrentUser();
        GroupMember actorMember = groupAccessValidator.validateMember(groupId, user.getId());
        Expense expense = findActiveExpense(groupId, expenseId);
        validateWriterOrOwner(expense, actorMember, user.getId());

        expense.softDelete();
        // TODO(FR-SSE-02): SSE 기반 동기화가 준비되면 EXPENSE_DELETED 이벤트를 발행한다.
    }

    // FR-EXPENSE-01: 중복 참여자를 제거한 뒤 모두 현재 그룹 멤버인지 확인한다.
    private List<GroupMember> resolveParticipants(Long groupId, List<Long> participantIds) {
        List<Long> distinctParticipantIds = new ArrayList<>(new LinkedHashSet<>(participantIds));
        if (distinctParticipantIds.isEmpty()) {
            throw new BusinessException(ErrorCode.INVALID_INPUT);
        }

        return distinctParticipantIds.stream()
                .map(userId -> groupAccessValidator.validateMember(groupId, userId))
                .toList();
    }

    private Expense findActiveExpense(Long groupId, Long expenseId) {
        return expenseRepository.findByIdAndTravelGroupIdAndDeletedAtIsNull(expenseId, groupId)
                .orElseThrow(() -> new BusinessException(ErrorCode.NOT_FOUND));
    }

    // FR-EXPENSE-03: 지출 작성자이거나 그룹 Owner인 경우에만 수정/삭제를 허용한다.
    private void validateWriterOrOwner(Expense expense, GroupMember actorMember, Long actorUserId) {
        if (expense.getCreatedBy().getId().equals(actorUserId) || actorMember.isOwner()) {
            return;
        }
        throw new BusinessException(ErrorCode.GROUP_OWNER_REQUIRED);
    }

    // FR-EXPENSE-01: 첫 단위에서는 균등 분담만 실제 계산하고, 나머지 방식은 다음 단위에서 확장한다.
    private List<ExpenseSplit> createSplits(Expense expense, List<GroupMember> participantMembers) {
        if (expense.getSplitType() != SplitType.EQUAL) {
            throw new BusinessException(ErrorCode.INVALID_INPUT);
        }

        long baseAmount = expense.getAmount() / participantMembers.size();
        long remainder = expense.getAmount() % participantMembers.size();

        List<ExpenseSplit> splits = new ArrayList<>();
        for (int i = 0; i < participantMembers.size(); i++) {
            long owedAmount = baseAmount + (i < remainder ? 1 : 0);
            splits.add(ExpenseSplit.builder()
                    .expense(expense)
                    .user(participantMembers.get(i).getUser())
                    .owedAmount(owedAmount)
                    .build());
        }
        return splits;
    }
}
