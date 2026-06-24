package com.enjoytrip.backend.domain.expense.service;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.EnumMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.TreeMap;
import java.util.stream.Collectors;

import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.enjoytrip.backend.domain.auth.entity.User;
import com.enjoytrip.backend.domain.expense.dto.ExpenseCategoryTotalResponse;
import com.enjoytrip.backend.domain.expense.dto.ExpenseCreateRequest;
import com.enjoytrip.backend.domain.expense.dto.ExpenseDailyTotalResponse;
import com.enjoytrip.backend.domain.expense.dto.ExpenseResponse;
import com.enjoytrip.backend.domain.expense.dto.ExpenseSplitRequest;
import com.enjoytrip.backend.domain.expense.dto.ExpenseSummaryResponse;
import com.enjoytrip.backend.domain.expense.dto.ExpenseUpdateRequest;
import com.enjoytrip.backend.domain.expense.entity.Expense;
import com.enjoytrip.backend.domain.expense.entity.ExpenseCategory;
import com.enjoytrip.backend.domain.expense.entity.ExpenseSplit;
import com.enjoytrip.backend.domain.expense.entity.SplitType;
import com.enjoytrip.backend.domain.expense.repository.ExpenseRepository;
import com.enjoytrip.backend.domain.expense.repository.ExpenseSplitRepository;
import com.enjoytrip.backend.domain.group.entity.GroupMember;
import com.enjoytrip.backend.domain.group.entity.TravelGroup;
import com.enjoytrip.backend.domain.group.repository.GroupMemberRepository;
import com.enjoytrip.backend.domain.group.repository.TravelGroupRepository;
import com.enjoytrip.backend.domain.group.service.CurrentUserResolver;
import com.enjoytrip.backend.domain.group.service.GroupAccessValidator;
import com.enjoytrip.backend.global.exception.BusinessException;
import com.enjoytrip.backend.global.exception.ErrorCode;
import com.enjoytrip.backend.global.event.DomainEvent;
import com.enjoytrip.backend.global.event.EventType;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
@Transactional
public class ExpenseService {

    private final ExpenseRepository expenseRepository;
    private final ExpenseSplitRepository expenseSplitRepository;
    private final TravelGroupRepository travelGroupRepository;
    private final GroupMemberRepository groupMemberRepository;
    private final CurrentUserResolver currentUserResolver;
    private final GroupAccessValidator groupAccessValidator;
    private final ApplicationEventPublisher eventPublisher;

    /**
     * FR-EXPENSE-01: 지출 등록.
     * 그룹 멤버가 결제자와 참여자를 선택하면 분담 방식에 따라 부담 금액을 계산해 저장한다.
     */
    public ExpenseResponse create(Long groupId, ExpenseCreateRequest request) {
        User creator = currentUserResolver.getCurrentUser();
        groupAccessValidator.validateMember(groupId, creator.getId());

        TravelGroup group = travelGroupRepository.findByIdAndDeletedAtIsNull(groupId)
                .orElseThrow(() -> new BusinessException(ErrorCode.GROUP_NOT_FOUND));
        GroupMember payerMember = groupAccessValidator.validateMember(groupId, request.payerId());
        List<ResolvedSplit> resolvedSplits = resolveSplits(
                groupId,
                request.amount(),
                request.splitType(),
                request.participantIds(),
                request.splitDetails()
        );

        Expense expense = Expense.builder()
                .travelGroup(group)
                .payer(payerMember.getUser())
                .createdBy(creator)
                .amount(request.amount())
                .category(request.category())
                .splitType(request.splitType())
                .description(request.description())
                .memo(request.memo())
                .paidAt(request.paidAt())
                .sourceScheduleId(request.sourceScheduleId())
                .build();
        Expense savedExpense = expenseRepository.save(expense);

        List<ExpenseSplit> splits = createSplits(savedExpense, resolvedSplits);
        expenseSplitRepository.saveAll(splits);

        ExpenseResponse response = ExpenseResponse.from(savedExpense, splits);
        publish(EventType.EXPENSE_ADDED, groupId, creator.getId(), response);
        return response;
    }

    /**
     * 일정 예상 비용을 정산 연동 지출(카테고리 OTHER, 균등 분담, sourceScheduleId 연결)로 동기화한다.
     * - 금액이 있으면 일정당 1건을 멱등하게 생성/수정(결제자 지정 필수)
     * - 금액이 비면 연동 지출을 삭제(soft delete)
     * 일정 수정/삭제 흐름에서 호출하므로 작성자/Owner 권한 대신 시스템 관리로 처리한다.
     */
    public void syncScheduleCostExpense(
            Long groupId, Long scheduleId, String description, LocalDate paidAt, Long amount, Long payerId) {
        User actor = currentUserResolver.getCurrentUser();
        var existing = expenseRepository
                .findFirstByTravelGroupIdAndSourceScheduleIdAndCategoryAndDeletedAtIsNull(
                        groupId, scheduleId, ExpenseCategory.OTHER);

        // 비용 없음 → 연동 지출 제거
        if (amount == null || amount <= 0) {
            existing.ifPresent(expense -> {
                expense.softDelete();
                publish(EventType.EXPENSE_DELETED, groupId, actor.getId(), Map.of("expenseId", expense.getId()));
            });
            return;
        }
        if (payerId == null) {
            throw new BusinessException(ErrorCode.INVALID_INPUT);
        }

        GroupMember payerMember = groupAccessValidator.validateMember(groupId, payerId);
        List<Long> participantIds = groupMemberRepository.findByTravelGroupIdAndLeftAtIsNull(groupId).stream()
                .map(member -> member.getUser().getId())
                .toList();
        List<ResolvedSplit> resolvedSplits = resolveSplits(groupId, amount, SplitType.EQUAL, participantIds, null);

        if (existing.isPresent()) {
            Expense expense = existing.get();
            expense.update(payerMember.getUser(), amount, ExpenseCategory.OTHER, SplitType.EQUAL,
                    description, expense.getMemo(), paidAt, scheduleId);
            expenseSplitRepository.deleteByExpenseId(expense.getId());
            List<ExpenseSplit> splits = createSplits(expense, resolvedSplits);
            expenseSplitRepository.saveAll(splits);
            publish(EventType.EXPENSE_UPDATED, groupId, actor.getId(), ExpenseResponse.from(expense, splits));
            return;
        }

        TravelGroup group = travelGroupRepository.findByIdAndDeletedAtIsNull(groupId)
                .orElseThrow(() -> new BusinessException(ErrorCode.GROUP_NOT_FOUND));
        Expense expense = expenseRepository.save(Expense.builder()
                .travelGroup(group)
                .payer(payerMember.getUser())
                .createdBy(actor)
                .amount(amount)
                .category(ExpenseCategory.OTHER)
                .splitType(SplitType.EQUAL)
                .description(description)
                .paidAt(paidAt)
                .sourceScheduleId(scheduleId)
                .build());
        List<ExpenseSplit> splits = createSplits(expense, resolvedSplits);
        expenseSplitRepository.saveAll(splits);
        publish(EventType.EXPENSE_ADDED, groupId, actor.getId(), ExpenseResponse.from(expense, splits));
    }

    /**
     * FR-EXPENSE-02: 지출 목록 조회.
     * 그룹 멤버만 삭제되지 않은 지출을 결제일 최신순으로 확인할 수 있다.
     */
    @Transactional(readOnly = true)
    public List<ExpenseResponse> findGroupExpenses(
            Long groupId,
            ExpenseCategory category,
            Long payerId,
            LocalDate startDate,
            LocalDate endDate
    ) {
        User user = currentUserResolver.getCurrentUser();
        groupAccessValidator.validateMember(groupId, user.getId());
        validateDateFilter(startDate, endDate);

        List<Expense> expenses = expenseRepository.findAllByFilters(groupId, category, payerId, startDate, endDate);
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
     * FR-EXPENSE-02: 지출 요약 조회.
     * 목록과 동일한 필터를 적용해 총액, 활성 멤버 기준 평균, 카테고리/일자별 합계를 계산한다.
     */
    @Transactional(readOnly = true)
    public ExpenseSummaryResponse summarize(
            Long groupId,
            ExpenseCategory category,
            Long payerId,
            LocalDate startDate,
            LocalDate endDate
    ) {
        User user = currentUserResolver.getCurrentUser();
        groupAccessValidator.validateMember(groupId, user.getId());
        validateDateFilter(startDate, endDate);

        List<Expense> expenses = expenseRepository.findAllByFilters(groupId, category, payerId, startDate, endDate);
        long totalExpenseAmount = expenses.stream().mapToLong(Expense::getAmount).sum();
        long activeMemberCount = groupMemberRepository.countByTravelGroupIdAndLeftAtIsNull(groupId);
        long averagePerMemberAmount = activeMemberCount == 0 ? 0 : totalExpenseAmount / activeMemberCount;

        Map<ExpenseCategory, Long> categoryTotals = new EnumMap<>(ExpenseCategory.class);
        Map<LocalDate, Long> dailyTotals = new TreeMap<>();
        for (Expense expense : expenses) {
            categoryTotals.merge(expense.getCategory(), expense.getAmount(), Long::sum);
            dailyTotals.merge(expense.getPaidAt(), expense.getAmount(), Long::sum);
        }

        return new ExpenseSummaryResponse(
                totalExpenseAmount,
                averagePerMemberAmount,
                categoryTotals.entrySet().stream()
                        .map(entry -> new ExpenseCategoryTotalResponse(entry.getKey(), entry.getValue()))
                        .toList(),
                dailyTotals.entrySet().stream()
                        .map(entry -> new ExpenseDailyTotalResponse(entry.getKey(), entry.getValue()))
                        .toList()
        );
    }

    /**
     * FR-EXPENSE-03: 지출 수정.
     * 작성자 또는 그룹 Owner만 수정할 수 있고, 수정 후 분담 결과를 다시 계산한다.
     */
    public ExpenseResponse update(Long groupId, Long expenseId, ExpenseUpdateRequest request) {
        User user = currentUserResolver.getCurrentUser();
        // 협업 정책: 그룹 멤버면 누구나 지출을 수정할 수 있다(삭제는 작성자/Owner로 제한).
        groupAccessValidator.validateMember(groupId, user.getId());
        Expense expense = findActiveExpense(groupId, expenseId);

        GroupMember payerMember = groupAccessValidator.validateMember(groupId, request.payerId());
        List<ResolvedSplit> resolvedSplits = resolveSplits(
                groupId,
                request.amount(),
                request.splitType(),
                request.participantIds(),
                request.splitDetails()
        );

        expense.update(
                payerMember.getUser(),
                request.amount(),
                request.category(),
                request.splitType(),
                request.description(),
                request.memo(),
                request.paidAt(),
                request.sourceScheduleId()
        );

        expenseSplitRepository.deleteByExpenseId(expense.getId());
        List<ExpenseSplit> splits = createSplits(expense, resolvedSplits);
        expenseSplitRepository.saveAll(splits);

        ExpenseResponse response = ExpenseResponse.from(expense, splits);
        publish(EventType.EXPENSE_UPDATED, groupId, user.getId(), response);
        return response;
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
        publish(EventType.EXPENSE_DELETED, groupId, user.getId(), Map.of("expenseId", expenseId));
    }

    // FR-EXPENSE-01: 중복 참여자를 제거한 뒤 모두 현재 그룹 멤버인지 확인한다.
    private List<GroupMember> resolveParticipants(Long groupId, List<Long> participantIds) {
        if (!hasValues(participantIds) || participantIds.stream().anyMatch(id -> id == null)) {
            throw new BusinessException(ErrorCode.INVALID_INPUT);
        }
        List<Long> distinctParticipantIds = new ArrayList<>(new LinkedHashSet<>(participantIds));

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

    // FR-EXPENSE-01: 분담 방식별 입력을 검증하고 참여자별 최종 부담 금액을 확정한다.
    private List<ResolvedSplit> resolveSplits(
            Long groupId,
            long totalAmount,
            SplitType splitType,
            List<Long> participantIds,
            List<ExpenseSplitRequest> splitDetails
    ) {
        return switch (splitType) {
            case EQUAL -> resolveEqualSplits(groupId, totalAmount, participantIds, splitDetails);
            case RATIO -> resolveRatioSplits(groupId, totalAmount, participantIds, splitDetails);
            case AMOUNT -> resolveAmountSplits(groupId, totalAmount, participantIds, splitDetails);
        };
    }

    private List<ResolvedSplit> resolveEqualSplits(
            Long groupId,
            long totalAmount,
            List<Long> participantIds,
            List<ExpenseSplitRequest> splitDetails
    ) {
        if (hasValues(splitDetails)) {
            throw new BusinessException(ErrorCode.INVALID_INPUT);
        }

        List<GroupMember> participantMembers = resolveParticipants(groupId, participantIds);
        long baseAmount = totalAmount / participantMembers.size();
        long remainder = totalAmount % participantMembers.size();

        List<ResolvedSplit> splits = new ArrayList<>();
        for (int i = 0; i < participantMembers.size(); i++) {
            long owedAmount = baseAmount + (i < remainder ? 1 : 0);
            splits.add(new ResolvedSplit(participantMembers.get(i), owedAmount));
        }
        return splits;
    }

    private List<ResolvedSplit> resolveRatioSplits(
            Long groupId,
            long totalAmount,
            List<Long> participantIds,
            List<ExpenseSplitRequest> splitDetails
    ) {
        validateDetailedSplitInput(participantIds, splitDetails);

        long ratioTotal = 0;
        for (ExpenseSplitRequest detail : splitDetails) {
            if (detail.ratio() == null || detail.ratio() <= 0 || detail.amount() != null) {
                throw new BusinessException(ErrorCode.INVALID_INPUT);
            }
            ratioTotal += detail.ratio();
        }
        if (ratioTotal != 100) {
            throw new BusinessException(ErrorCode.EXPENSE_RATIO_SUM_INVALID);
        }

        List<GroupMember> members = resolveDetailedParticipants(groupId, splitDetails);
        List<ResolvedSplit> splits = new ArrayList<>();
        long allocated = 0;
        for (int i = 0; i < splitDetails.size(); i++) {
            long owedAmount = totalAmount * splitDetails.get(i).ratio() / 100;
            allocated += owedAmount;
            splits.add(new ResolvedSplit(members.get(i), owedAmount));
        }

        // 정수 비율 계산에서 남는 원 단위는 요청 순서대로 1원씩 배분해 총액을 보존한다.
        long remainder = totalAmount - allocated;
        for (int i = 0; i < remainder; i++) {
            ResolvedSplit split = splits.get(i);
            splits.set(i, new ResolvedSplit(split.member(), split.owedAmount() + 1));
        }
        return splits;
    }

    private List<ResolvedSplit> resolveAmountSplits(
            Long groupId,
            long totalAmount,
            List<Long> participantIds,
            List<ExpenseSplitRequest> splitDetails
    ) {
        validateDetailedSplitInput(participantIds, splitDetails);

        long amountTotal = 0;
        for (ExpenseSplitRequest detail : splitDetails) {
            if (detail.amount() == null || detail.amount() <= 0 || detail.amount() > totalAmount || detail.ratio() != null) {
                throw new BusinessException(ErrorCode.INVALID_INPUT);
            }
            amountTotal += detail.amount();
        }
        if (amountTotal != totalAmount) {
            throw new BusinessException(ErrorCode.EXPENSE_AMOUNT_SUM_INVALID);
        }

        List<GroupMember> members = resolveDetailedParticipants(groupId, splitDetails);
        List<ResolvedSplit> splits = new ArrayList<>();
        for (int i = 0; i < splitDetails.size(); i++) {
            splits.add(new ResolvedSplit(members.get(i), splitDetails.get(i).amount()));
        }
        return splits;
    }

    private void validateDetailedSplitInput(
            List<Long> participantIds,
            List<ExpenseSplitRequest> splitDetails
    ) {
        if (hasValues(participantIds) || !hasValues(splitDetails) || splitDetails.stream().anyMatch(detail -> detail == null)) {
            throw new BusinessException(ErrorCode.INVALID_INPUT);
        }
    }

    private List<GroupMember> resolveDetailedParticipants(Long groupId, List<ExpenseSplitRequest> splitDetails) {
        List<Long> participantIds = splitDetails.stream()
                .map(ExpenseSplitRequest::participantId)
                .toList();
        if (participantIds.stream().anyMatch(id -> id == null)
                || new LinkedHashSet<>(participantIds).size() != participantIds.size()) {
            throw new BusinessException(ErrorCode.INVALID_INPUT);
        }

        return participantIds.stream()
                .map(userId -> groupAccessValidator.validateMember(groupId, userId))
                .toList();
    }

    private boolean hasValues(List<?> values) {
        return values != null && !values.isEmpty();
    }

    // FR-EXPENSE-02: 시작일이 종료일보다 늦은 필터는 잘못된 요청으로 처리한다.
    private void validateDateFilter(LocalDate startDate, LocalDate endDate) {
        if (startDate != null && endDate != null && startDate.isAfter(endDate)) {
            throw new BusinessException(ErrorCode.INVALID_INPUT);
        }
    }

    private List<ExpenseSplit> createSplits(Expense expense, List<ResolvedSplit> resolvedSplits) {
        List<ExpenseSplit> splits = new ArrayList<>();
        for (ResolvedSplit resolvedSplit : resolvedSplits) {
            splits.add(ExpenseSplit.builder()
                    .expense(expense)
                    .user(resolvedSplit.member().getUser())
                    .owedAmount(resolvedSplit.owedAmount())
                    .build());
        }
        return splits;
    }

    private record ResolvedSplit(GroupMember member, long owedAmount) {
    }

    private void publish(EventType type, Long groupId, Long actorId, Object payload) {
        eventPublisher.publishEvent(DomainEvent.of(type, groupId, actorId, payload));
    }
}
