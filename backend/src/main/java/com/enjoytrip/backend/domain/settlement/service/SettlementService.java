package com.enjoytrip.backend.domain.settlement.service;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.enjoytrip.backend.global.event.DomainEvent;
import com.enjoytrip.backend.global.event.EventType;

import com.enjoytrip.backend.domain.auth.entity.User;
import com.enjoytrip.backend.domain.auth.repository.UserRepository;
import com.enjoytrip.backend.domain.expense.entity.Expense;
import com.enjoytrip.backend.domain.expense.entity.ExpenseSplit;
import com.enjoytrip.backend.domain.expense.repository.ExpenseRepository;
import com.enjoytrip.backend.domain.expense.repository.ExpenseSplitRepository;
import com.enjoytrip.backend.domain.group.entity.GroupMember;
import com.enjoytrip.backend.domain.group.repository.GroupMemberRepository;
import com.enjoytrip.backend.domain.group.repository.TravelGroupRepository;
import com.enjoytrip.backend.domain.group.service.CurrentUserResolver;
import com.enjoytrip.backend.domain.group.service.GroupAccessValidator;
import com.enjoytrip.backend.domain.settlement.dto.SettlementBalanceResponse;
import com.enjoytrip.backend.domain.settlement.dto.SettlementPaymentLinksResponse;
import com.enjoytrip.backend.domain.settlement.dto.SettlementProgressResponse;
import com.enjoytrip.backend.domain.settlement.dto.SettlementRecordResponse;
import com.enjoytrip.backend.domain.settlement.dto.SettlementSummaryResponse;
import com.enjoytrip.backend.domain.settlement.dto.SettlementTransferResponse;
import com.enjoytrip.backend.domain.settlement.entity.Settlement;
import com.enjoytrip.backend.domain.settlement.entity.SettlementStatus;
import com.enjoytrip.backend.domain.settlement.repository.SettlementRepository;
import com.enjoytrip.backend.global.exception.BusinessException;
import com.enjoytrip.backend.global.exception.ErrorCode;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class SettlementService {

    private final ExpenseRepository expenseRepository;
    private final ExpenseSplitRepository expenseSplitRepository;
    private final GroupMemberRepository groupMemberRepository;
    private final TravelGroupRepository travelGroupRepository;
    private final UserRepository userRepository;
    private final SettlementRepository settlementRepository;
    private final CurrentUserResolver currentUserResolver;
    private final GroupAccessValidator groupAccessValidator;
    private final SettlementCalculator settlementCalculator;
    private final SettlementPaymentLinkGenerator settlementPaymentLinkGenerator;
    private final ApplicationEventPublisher eventPublisher;

    // 정산 상태 변화를 그룹에 실시간 전파(프론트는 정산/지출 화면을 갱신).
    private void publishSettlementUpdated(Long groupId, Long actorId) {
        eventPublisher.publishEvent(DomainEvent.of(EventType.SETTLEMENT_UPDATED, groupId, actorId, Map.of()));
    }

    /**
     * FR-EXPENSE-04: 정산 매트릭스 조회.
     * 멤버별 잔액은 낸 돈에서 부담해야 할 돈을 뺀 값으로 계산한다.
     */
    public SettlementSummaryResponse calculate(Long groupId) {
        User user = currentUserResolver.getCurrentUser();
        groupAccessValidator.validateMember(groupId, user.getId());

        List<Expense> expenses = expenseRepository.findByTravelGroupIdAndDeletedAtIsNullOrderByPaidAtDescIdDesc(groupId);
        List<Long> expenseIds = expenses.stream()
                .map(Expense::getId)
                .toList();
        List<ExpenseSplit> splits = expenseIds.isEmpty()
                ? List.of()
                : expenseSplitRepository.findByExpenseIdIn(expenseIds);

        Map<Long, BalanceAccumulator> balances = createInitialBalances(groupId);
        long totalExpenseAmount = 0L;

        for (Expense expense : expenses) {
            totalExpenseAmount += expense.getAmount();
            BalanceAccumulator payerBalance = balances.computeIfAbsent(
                    expense.getPayer().getId(),
                    userId -> BalanceAccumulator.from(expense.getPayer())
            );
            payerBalance.addPaidAmount(expense.getAmount());
        }

        for (ExpenseSplit split : splits) {
            BalanceAccumulator splitBalance = balances.computeIfAbsent(
                    split.getUser().getId(),
                    userId -> BalanceAccumulator.from(split.getUser())
            );
            splitBalance.addOwedAmount(split.getOwedAmount());
        }

        List<SettlementBalanceResponse> balanceResponses = balances.values().stream()
                .map(BalanceAccumulator::toResponse)
                .toList();
        List<SettlementTransferResponse> transfers = settlementCalculator.calculateTransfers(balanceResponses);
        long averagePerMemberAmount = balances.isEmpty() ? 0L : totalExpenseAmount / balances.size();

        return new SettlementSummaryResponse(
                groupId,
                totalExpenseAmount,
                averagePerMemberAmount,
                balanceResponses,
                transfers
        );
    }

    /**
     * FR-EXPENSE-06: 현재 정산 계산 결과를 확인 가능한 송금 스냅샷으로 저장한다.
     * 그룹마다 한 번만 시작할 수 있어 이미 체크한 상태가 재계산으로 사라지지 않게 한다.
     */
    @Transactional
    public SettlementProgressResponse start(Long groupId) {
        User actor = currentUserResolver.getCurrentUser();
        groupAccessValidator.validateMember(groupId, actor.getId());

        if (settlementRepository.existsByTravelGroupId(groupId)) {
            throw new BusinessException(ErrorCode.SETTLEMENT_ALREADY_STARTED);
        }

        SettlementSummaryResponse summary = calculate(groupId);
        if (summary.transfers().isEmpty()) {
            throw new BusinessException(ErrorCode.SETTLEMENT_NOT_REQUIRED);
        }

        var group = travelGroupRepository.findByIdAndDeletedAtIsNull(groupId)
                .orElseThrow(() -> new BusinessException(ErrorCode.GROUP_NOT_FOUND));
        List<Long> userIds = summary.transfers().stream()
                .flatMap(transfer -> List.of(transfer.fromUserId(), transfer.toUserId()).stream())
                .distinct()
                .toList();
        Map<Long, User> users = userRepository.findAllById(userIds).stream()
                .collect(Collectors.toMap(User::getId, Function.identity()));

        List<Settlement> settlements = summary.transfers().stream()
                .map(transfer -> Settlement.builder()
                        .travelGroup(group)
                        .fromUser(findUser(users, transfer.fromUserId()))
                        .toUser(findUser(users, transfer.toUserId()))
                        .amount(transfer.amount())
                        .build())
                .toList();

        SettlementProgressResponse progress = toProgress(groupId, settlementRepository.saveAll(settlements));
        publishSettlementUpdated(groupId, actor.getId());
        return progress;
    }

    // 저장된 정산 송금 상태는 그룹 멤버 누구나 조회할 수 있다.
    public SettlementProgressResponse findProgress(Long groupId) {
        User actor = currentUserResolver.getCurrentUser();
        groupAccessValidator.validateMember(groupId, actor.getId());

        List<Settlement> settlements = settlementRepository.findByTravelGroupIdOrderByIdAsc(groupId);
        if (settlements.isEmpty()) {
            throw new BusinessException(ErrorCode.SETTLEMENT_NOT_FOUND);
        }
        return toProgress(groupId, settlements);
    }

    // 송금자 본인만 PENDING 송금을 보냈다고 체크할 수 있다.
    @Transactional
    public SettlementProgressResponse confirmSent(Long groupId, Long settlementId) {
        User actor = currentUserResolver.getCurrentUser();
        groupAccessValidator.validateMember(groupId, actor.getId());

        Settlement settlement = findSettlement(groupId, settlementId);
        settlement.confirmSent(actor.getId());
        SettlementProgressResponse progress = toProgress(groupId, settlementRepository.findByTravelGroupIdOrderByIdAsc(groupId));
        publishSettlementUpdated(groupId, actor.getId());
        return progress;
    }

    // 수취인 본인만 SENT 송금의 입금을 확인해 COMPLETED로 전환할 수 있다.
    @Transactional
    public SettlementProgressResponse confirmReceived(Long groupId, Long settlementId) {
        User actor = currentUserResolver.getCurrentUser();
        groupAccessValidator.validateMember(groupId, actor.getId());

        Settlement settlement = findSettlement(groupId, settlementId);
        settlement.confirmReceived(actor.getId());
        SettlementProgressResponse progress = toProgress(groupId, settlementRepository.findByTravelGroupIdOrderByIdAsc(groupId));
        publishSettlementUpdated(groupId, actor.getId());
        return progress;
    }

    /**
     * FR-EXPENSE-05: 송금자 본인의 대기 중 송금에 대해 Toss/KakaoPay 딥링크를 생성한다.
     * 반환 URL은 앱 실행 또는 프론트 QR 생성에만 쓰며 실제 송금 성공을 의미하지 않는다.
     */
    public SettlementPaymentLinksResponse createPaymentLinks(Long groupId, Long settlementId) {
        User actor = currentUserResolver.getCurrentUser();
        groupAccessValidator.validateMember(groupId, actor.getId());

        Settlement settlement = findSettlement(groupId, settlementId);
        if (!settlement.getFromUser().getId().equals(actor.getId())) {
            throw new BusinessException(ErrorCode.SETTLEMENT_CONFIRMATION_FORBIDDEN);
        }
        if (settlement.getStatus() != SettlementStatus.PENDING) {
            throw new BusinessException(ErrorCode.SETTLEMENT_INVALID_STATUS);
        }

        return settlementPaymentLinkGenerator.generate(settlement);
    }

    private Settlement findSettlement(Long groupId, Long settlementId) {
        return settlementRepository.findByIdAndTravelGroupId(settlementId, groupId)
                .orElseThrow(() -> new BusinessException(ErrorCode.SETTLEMENT_NOT_FOUND));
    }

    private User findUser(Map<Long, User> users, Long userId) {
        User user = users.get(userId);
        if (user == null) {
            throw new BusinessException(ErrorCode.USER_NOT_FOUND);
        }
        return user;
    }

    private SettlementProgressResponse toProgress(Long groupId, List<Settlement> settlements) {
        return new SettlementProgressResponse(
                groupId,
                !settlements.isEmpty() && settlements.stream().allMatch(Settlement::isCompleted),
                settlements.stream().map(SettlementRecordResponse::from).toList()
        );
    }

    // 활성 멤버를 먼저 넣어 지출이 없는 멤버도 0원 잔액으로 표시한다.
    private Map<Long, BalanceAccumulator> createInitialBalances(Long groupId) {
        Map<Long, BalanceAccumulator> balances = new LinkedHashMap<>();
        for (GroupMember member : groupMemberRepository.findByTravelGroupIdAndLeftAtIsNull(groupId)) {
            balances.put(member.getUser().getId(), BalanceAccumulator.from(member.getUser()));
        }
        return balances;
    }

    private static class BalanceAccumulator {
        private final Long userId;
        private final String name;
        private Long paidAmount = 0L;
        private Long owedAmount = 0L;

        private BalanceAccumulator(Long userId, String name) {
            this.userId = userId;
            this.name = name;
        }

        private static BalanceAccumulator from(User user) {
            return new BalanceAccumulator(user.getId(), user.getName());
        }

        private void addPaidAmount(Long amount) {
            paidAmount += amount;
        }

        private void addOwedAmount(Long amount) {
            owedAmount += amount;
        }

        private SettlementBalanceResponse toResponse() {
            return new SettlementBalanceResponse(
                    userId,
                    name,
                    paidAmount,
                    owedAmount,
                    paidAmount - owedAmount
            );
        }
    }
}
