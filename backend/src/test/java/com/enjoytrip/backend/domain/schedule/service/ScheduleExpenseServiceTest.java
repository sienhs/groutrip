package com.enjoytrip.backend.domain.schedule.service;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;
import java.util.Optional;

import org.assertj.core.api.Assertions;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.test.util.ReflectionTestUtils;

import com.enjoytrip.backend.domain.auth.entity.User;
import com.enjoytrip.backend.domain.expense.dto.ExpenseCreateRequest;
import com.enjoytrip.backend.domain.expense.entity.ExpenseCategory;
import com.enjoytrip.backend.domain.expense.entity.SplitType;
import com.enjoytrip.backend.domain.expense.service.ExpenseService;
import com.enjoytrip.backend.domain.group.entity.GroupMember;
import com.enjoytrip.backend.domain.group.entity.GroupRole;
import com.enjoytrip.backend.domain.group.entity.GroupStatus;
import com.enjoytrip.backend.domain.group.entity.TravelGroup;
import com.enjoytrip.backend.domain.group.repository.GroupMemberRepository;
import com.enjoytrip.backend.domain.group.service.CurrentUserResolver;
import com.enjoytrip.backend.domain.group.service.GroupAccessValidator;
import com.enjoytrip.backend.domain.place.entity.Place;
import com.enjoytrip.backend.domain.schedule.dto.TransportCostType;
import com.enjoytrip.backend.domain.schedule.dto.TransportExpenseRequest;
import com.enjoytrip.backend.domain.schedule.dto.TransportLegResponse;
import com.enjoytrip.backend.domain.schedule.entity.Schedule;
import com.enjoytrip.backend.domain.schedule.entity.ScheduleStatus;
import com.enjoytrip.backend.domain.schedule.entity.TransportMode;
import com.enjoytrip.backend.domain.schedule.repository.ScheduleRepository;
import com.enjoytrip.backend.global.exception.BusinessException;
import com.enjoytrip.backend.global.exception.ErrorCode;

class ScheduleExpenseServiceTest {

    private ScheduleRepository scheduleRepository;
    private TransportService transportService;
    private ExpenseService expenseService;
    private GroupMemberRepository groupMemberRepository;
    private CurrentUserResolver currentUserResolver;
    private GroupAccessValidator groupAccessValidator;
    private ScheduleExpenseService scheduleExpenseService;

    @BeforeEach
    void setUp() {
        scheduleRepository = mock(ScheduleRepository.class);
        transportService = mock(TransportService.class);
        expenseService = mock(ExpenseService.class);
        groupMemberRepository = mock(GroupMemberRepository.class);
        currentUserResolver = mock(CurrentUserResolver.class);
        groupAccessValidator = mock(GroupAccessValidator.class);
        scheduleExpenseService = new ScheduleExpenseService(
                scheduleRepository, transportService, expenseService,
                groupMemberRepository, currentUserResolver, groupAccessValidator);
    }

    @Test
    void drivingRegistersTransportExpenseWithCarCostSplitEqually() {
        User user = user(1L);
        when(currentUserResolver.getCurrentUser()).thenReturn(user);
        when(scheduleRepository.findByIdAndTravelGroupId(10L, 1L))
                .thenReturn(Optional.of(schedule(user, "강남역")));
        when(transportService.getLeg(1L, 10L, 11L, TransportMode.CAR)).thenReturn(carLeg(2962));
        when(groupMemberRepository.findByTravelGroupIdAndLeftAtIsNull(1L))
                .thenReturn(List.of(member(user, 1L), member(user(2L), 2L)));

        scheduleExpenseService.registerTransportExpense(1L, new TransportExpenseRequest(
                10L, 11L, TransportCostType.DRIVING, 1L, null));

        ArgumentCaptor<ExpenseCreateRequest> captor = ArgumentCaptor.forClass(ExpenseCreateRequest.class);
        verify(expenseService).create(eq(1L), captor.capture());
        ExpenseCreateRequest req = captor.getValue();
        Assertions.assertThat(req.amount()).isEqualTo(2962L);
        Assertions.assertThat(req.category()).isEqualTo(ExpenseCategory.TRANSPORT);
        Assertions.assertThat(req.splitType()).isEqualTo(SplitType.EQUAL);
        Assertions.assertThat(req.sourceScheduleId()).isEqualTo(10L);
        Assertions.assertThat(req.participantIds()).containsExactly(1L, 2L); // 미지정 → 전원
        Assertions.assertThat(req.description()).contains("강남역");
    }

    @Test
    void transitWhenUnavailableIsRejected() {
        User user = user(1L);
        when(currentUserResolver.getCurrentUser()).thenReturn(user);
        when(scheduleRepository.findByIdAndTravelGroupId(10L, 1L))
                .thenReturn(Optional.of(schedule(user, "홍대")));
        when(transportService.getLeg(1L, 10L, 11L, TransportMode.TRANSIT)).thenReturn(unavailableTransitLeg());

        assertThatThrownBy(() -> scheduleExpenseService.registerTransportExpense(1L,
                new TransportExpenseRequest(10L, 11L, TransportCostType.TRANSIT, 1L, List.of(1L))))
                .isInstanceOf(BusinessException.class)
                .extracting(e -> ((BusinessException) e).getErrorCode())
                .isEqualTo(ErrorCode.DIRECTIONS_FETCH_FAILED);
    }

    @Test
    void zeroAmountIsRejected() {
        User user = user(1L);
        when(currentUserResolver.getCurrentUser()).thenReturn(user);
        when(scheduleRepository.findByIdAndTravelGroupId(10L, 1L))
                .thenReturn(Optional.of(schedule(user, "공원")));
        when(transportService.getLeg(1L, 10L, 11L, TransportMode.CAR)).thenReturn(carLeg(0));

        assertThatThrownBy(() -> scheduleExpenseService.registerTransportExpense(1L,
                new TransportExpenseRequest(10L, 11L, TransportCostType.DRIVING, 1L, List.of(1L))))
                .isInstanceOf(BusinessException.class)
                .extracting(e -> ((BusinessException) e).getErrorCode())
                .isEqualTo(ErrorCode.INVALID_INPUT);
        verify(expenseService, org.mockito.Mockito.never()).create(anyLong(), any());
    }

    // --- helpers ---

    private TransportLegResponse carLeg(int carCost) {
        return new TransportLegResponse(TransportMode.CAR, true, 20, 15000,
                1000, carCost - 1000, carCost, 17000, null, null, null, null);
    }

    private TransportLegResponse unavailableTransitLeg() {
        return new TransportLegResponse(TransportMode.TRANSIT, false, null, null,
                null, null, null, null, null, null, null, "미지원");
    }

    private User user(Long id) {
        User user = User.builder().email("u" + id + "@test.com").password("enc").name("user" + id).build();
        ReflectionTestUtils.setField(user, "id", id);
        return user;
    }

    private Schedule schedule(User user, String placeName) {
        Place place = Place.builder()
                .googlePlaceId("g").name(placeName).address("주소")
                .latitude(37.0).longitude(127.0).types("cafe")
                .build();
        ReflectionTestUtils.setField(place, "id", 5L);
        Schedule schedule = Schedule.builder()
                .travelGroup(group()).place(place).scheduleDate(LocalDate.of(2026, 7, 1)).orderIndex(0)
                .startTime(LocalTime.of(9, 0)).endTime(LocalTime.of(10, 0))
                .status(ScheduleStatus.PLANNED).createdBy(user).updatedBy(user)
                .build();
        ReflectionTestUtils.setField(schedule, "id", 10L);
        return schedule;
    }

    private TravelGroup group() {
        TravelGroup group = TravelGroup.builder()
                .title("Trip").destination("Seoul")
                .startDate(LocalDate.of(2026, 7, 1)).endDate(LocalDate.of(2026, 7, 3))
                .inviteCode("ABC123").status(GroupStatus.PLANNING)
                .build();
        ReflectionTestUtils.setField(group, "id", 1L);
        return group;
    }

    private GroupMember member(User user, Long id) {
        GroupMember member = GroupMember.builder()
                .travelGroup(group()).user(user).role(GroupRole.MEMBER).build();
        ReflectionTestUtils.setField(member, "id", id);
        return member;
    }
}
