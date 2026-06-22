package com.enjoytrip.backend.domain.schedule.service;

import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.enjoytrip.backend.domain.auth.entity.User;
import com.enjoytrip.backend.domain.expense.dto.ExpenseCreateRequest;
import com.enjoytrip.backend.domain.expense.dto.ExpenseResponse;
import com.enjoytrip.backend.domain.expense.entity.ExpenseCategory;
import com.enjoytrip.backend.domain.expense.entity.SplitType;
import com.enjoytrip.backend.domain.expense.service.ExpenseService;
import com.enjoytrip.backend.domain.group.repository.GroupMemberRepository;
import com.enjoytrip.backend.domain.group.service.CurrentUserResolver;
import com.enjoytrip.backend.domain.group.service.GroupAccessValidator;
import com.enjoytrip.backend.domain.schedule.dto.TransportExpenseRequest;
import com.enjoytrip.backend.domain.schedule.dto.TransportLegResponse;
import com.enjoytrip.backend.domain.schedule.entity.Schedule;
import com.enjoytrip.backend.domain.schedule.entity.TransportMode;
import com.enjoytrip.backend.domain.schedule.repository.ScheduleRepository;
import com.enjoytrip.backend.global.exception.BusinessException;
import com.enjoytrip.backend.global.exception.ErrorCode;

import lombok.RequiredArgsConstructor;

/**
 * FR-EXPENSE-07: 일정 이동 비용을 정산에 등록한다.
 * Part B의 기존 지출 생성 계약({@link ExpenseService#create})을 그대로 호출하며(별도 자동등록 API를 만들지 않음),
 * category=TRANSPORT, splitType=EQUAL, sourceScheduleId로 일정과 느슨하게 연결한다.
 */
@Service
@RequiredArgsConstructor
@Transactional
public class ScheduleExpenseService {

    private final ScheduleRepository scheduleRepository;
    private final TransportService transportService;
    private final ExpenseService expenseService;
    private final GroupMemberRepository groupMemberRepository;
    private final CurrentUserResolver currentUserResolver;
    private final GroupAccessValidator groupAccessValidator;

    public ExpenseResponse registerTransportExpense(Long groupId, TransportExpenseRequest request) {
        User user = currentUserResolver.getCurrentUser();
        groupAccessValidator.validateMember(groupId, user.getId());

        Schedule from = scheduleRepository.findByIdAndTravelGroupId(request.fromScheduleId(), groupId)
                .orElseThrow(() -> new BusinessException(ErrorCode.SCHEDULE_NOT_FOUND));

        TransportMode mode = request.costType() == com.enjoytrip.backend.domain.schedule.dto.TransportCostType.TRANSIT
                ? TransportMode.TRANSIT
                : TransportMode.CAR;
        TransportLegResponse leg = transportService.getLeg(
                groupId, request.fromScheduleId(), request.toScheduleId(), mode);

        List<Long> participantIds = resolveParticipants(groupId, request.participantIds());
        long amount = resolveAmount(request, leg, participantIds.size());

        String description = "[자동] " + from.getPlace().getName() + " 이동";
        ExpenseCreateRequest expenseRequest = new ExpenseCreateRequest(
                amount,
                request.payerId(),
                ExpenseCategory.TRANSPORT,
                SplitType.EQUAL,
                description,
                from.getScheduleDate(),
                participantIds,
                request.fromScheduleId()
        );
        return expenseService.create(groupId, expenseRequest);
    }

    // 참여자 미지정 시 그룹 활성 멤버 전원으로 분담한다.
    private List<Long> resolveParticipants(Long groupId, List<Long> requested) {
        if (requested != null && !requested.isEmpty()) {
            return new ArrayList<>(new LinkedHashSet<>(requested));
        }
        return groupMemberRepository.findByTravelGroupIdAndLeftAtIsNull(groupId).stream()
                .map(member -> member.getUser().getId())
                .toList();
    }

    // FR-EXPENSE-07: 비용 종류별 금액 산출. 0원이면 등록할 수 없다.
    private long resolveAmount(TransportExpenseRequest request, TransportLegResponse leg, int participantCount) {
        Integer amount = switch (request.costType()) {
            case DRIVING -> leg.carCost();           // 톨비 + 연료비
            case TAXI -> leg.taxiFare();             // 예상 택시비
            case TRANSIT -> {
                if (!leg.available() || leg.transitFare() == null) {
                    throw new BusinessException(ErrorCode.DIRECTIONS_FETCH_FAILED);
                }
                yield leg.transitFare() * participantCount; // 운임 × 인원
            }
        };
        if (amount == null || amount <= 0) {
            throw new BusinessException(ErrorCode.INVALID_INPUT);
        }
        return amount.longValue();
    }
}
