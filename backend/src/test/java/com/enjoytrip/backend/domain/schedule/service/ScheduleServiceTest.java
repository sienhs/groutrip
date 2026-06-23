package com.enjoytrip.backend.domain.schedule.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;
import java.util.Optional;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.test.util.ReflectionTestUtils;

import com.enjoytrip.backend.domain.auth.entity.User;
import com.enjoytrip.backend.domain.group.entity.GroupStatus;
import com.enjoytrip.backend.domain.group.entity.TravelGroup;
import com.enjoytrip.backend.domain.group.repository.TravelGroupRepository;
import com.enjoytrip.backend.domain.group.service.CurrentUserResolver;
import com.enjoytrip.backend.domain.group.service.GroupAccessValidator;
import com.enjoytrip.backend.domain.place.entity.Place;
import com.enjoytrip.backend.domain.place.repository.PlaceRepository;
import com.enjoytrip.backend.domain.schedule.dto.ScheduleCreateRequest;
import com.enjoytrip.backend.domain.schedule.dto.ScheduleReorderRequest;
import com.enjoytrip.backend.domain.schedule.dto.ScheduleResponse;
import com.enjoytrip.backend.domain.schedule.entity.Schedule;
import com.enjoytrip.backend.domain.schedule.entity.ScheduleStatus;
import com.enjoytrip.backend.domain.schedule.entity.TransportMode;
import com.enjoytrip.backend.domain.schedule.repository.ScheduleRepository;
import com.enjoytrip.backend.global.event.DomainEvent;
import com.enjoytrip.backend.global.exception.BusinessException;
import com.enjoytrip.backend.global.exception.ErrorCode;

class ScheduleServiceTest {

    private ScheduleRepository scheduleRepository;
    private PlaceRepository placeRepository;
    private TravelGroupRepository travelGroupRepository;
    private CurrentUserResolver currentUserResolver;
    private GroupAccessValidator groupAccessValidator;
    private ApplicationEventPublisher eventPublisher;
    private ScheduleService scheduleService;

    @BeforeEach
    void setUp() {
        scheduleRepository = mock(ScheduleRepository.class);
        placeRepository = mock(PlaceRepository.class);
        travelGroupRepository = mock(TravelGroupRepository.class);
        currentUserResolver = mock(CurrentUserResolver.class);
        groupAccessValidator = mock(GroupAccessValidator.class);
        eventPublisher = mock(ApplicationEventPublisher.class);
        scheduleService = new ScheduleService(
                scheduleRepository, placeRepository, travelGroupRepository,
                currentUserResolver, groupAccessValidator, eventPublisher);
    }

    @Test
    void createAppendsAfterLastOrderIndexAndPublishesEvent() {
        User user = user(1L);
        TravelGroup group = group();
        Place place = place(5L);
        LocalDate date = LocalDate.of(2026, 7, 1);

        when(currentUserResolver.getCurrentUser()).thenReturn(user);
        when(travelGroupRepository.findByIdAndDeletedAtIsNull(1L)).thenReturn(Optional.of(group));
        when(placeRepository.findById(5L)).thenReturn(Optional.of(place));
        // 해당 일자에 orderIndex 2짜리 일정이 이미 있음 → 새 일정은 3
        Schedule existing = scheduleBuilder(group, place, user, date, 2);
        when(scheduleRepository.findByTravelGroupIdAndScheduleDateOrderByOrderIndexAsc(1L, date))
                .thenReturn(List.of(existing));
        when(scheduleRepository.save(any(Schedule.class))).thenAnswer(invocation -> {
            Schedule saved = invocation.getArgument(0);
            ReflectionTestUtils.setField(saved, "id", 100L);
            return saved;
        });

        ScheduleResponse response = scheduleService.create(1L, new ScheduleCreateRequest(
                5L, null, date, LocalTime.of(10, 0), LocalTime.of(12, 0), "메모", 30000L, TransportMode.CAR));

        assertThat(response.id()).isEqualTo(100L);
        assertThat(response.orderIndex()).isEqualTo(3);
        assertThat(response.status()).isEqualTo(ScheduleStatus.PLANNED);
        verify(eventPublisher).publishEvent(any(DomainEvent.class));
    }

    @Test
    void createRejectsInvalidTimeRange() {
        User user = user(1L);
        TravelGroup group = group();
        when(currentUserResolver.getCurrentUser()).thenReturn(user);
        when(travelGroupRepository.findByIdAndDeletedAtIsNull(1L)).thenReturn(Optional.of(group));

        assertThatThrownBy(() -> scheduleService.create(1L, new ScheduleCreateRequest(
                5L, null, LocalDate.of(2026, 7, 1), LocalTime.of(12, 0), LocalTime.of(10, 0), null, null, null)))
                .isInstanceOf(BusinessException.class)
                .extracting(e -> ((BusinessException) e).getErrorCode())
                .isEqualTo(ErrorCode.SCHEDULE_TIME_INVALID);
    }

    @Test
    void createRejectsDateOutsideTripPeriod() {
        User user = user(1L);
        TravelGroup group = group();
        when(currentUserResolver.getCurrentUser()).thenReturn(user);
        when(travelGroupRepository.findByIdAndDeletedAtIsNull(1L)).thenReturn(Optional.of(group));

        assertThatThrownBy(() -> scheduleService.create(1L, new ScheduleCreateRequest(
                5L, null, LocalDate.of(2026, 7, 10), LocalTime.of(10, 0), LocalTime.of(12, 0), null, null, null)))
                .isInstanceOf(BusinessException.class)
                .extracting(e -> ((BusinessException) e).getErrorCode())
                .isEqualTo(ErrorCode.SCHEDULE_OUT_OF_PERIOD);
    }

    @Test
    void reorderMovesSchedulesAndPublishesEvent() {
        User user = user(1L);
        TravelGroup group = group();
        Place place = place(5L);
        Schedule s1 = scheduleBuilder(group, place, user, LocalDate.of(2026, 7, 1), 0);
        ReflectionTestUtils.setField(s1, "id", 11L);

        when(currentUserResolver.getCurrentUser()).thenReturn(user);
        when(travelGroupRepository.findByIdAndDeletedAtIsNull(1L)).thenReturn(Optional.of(group));
        when(scheduleRepository.findByIdAndTravelGroupId(11L, 1L)).thenReturn(Optional.of(s1));

        List<ScheduleResponse> moved = scheduleService.reorder(1L, new ScheduleReorderRequest(List.of(
                new ScheduleReorderRequest.Item(11L, LocalDate.of(2026, 7, 2), 0))));

        assertThat(moved).hasSize(1);
        assertThat(moved.get(0).scheduleDate()).isEqualTo(LocalDate.of(2026, 7, 2)); // 다른 일자로 이동
        verify(eventPublisher).publishEvent(any(DomainEvent.class));
    }

    @Test
    void deleteRemovesScheduleAndPublishesEvent() {
        User user = user(1L);
        TravelGroup group = group();
        Place place = place(5L);
        Schedule s1 = scheduleBuilder(group, place, user, LocalDate.of(2026, 7, 1), 0);
        ReflectionTestUtils.setField(s1, "id", 11L);

        when(currentUserResolver.getCurrentUser()).thenReturn(user);
        when(scheduleRepository.findByIdAndTravelGroupId(11L, 1L)).thenReturn(Optional.of(s1));

        scheduleService.delete(1L, 11L);

        verify(scheduleRepository).delete(s1);
        verify(eventPublisher).publishEvent(any(DomainEvent.class));
    }

    @Test
    void findScheduleThrowsWhenNotInGroup() {
        User user = user(1L);
        when(currentUserResolver.getCurrentUser()).thenReturn(user);
        when(scheduleRepository.findByIdAndTravelGroupId(eq(99L), eq(1L))).thenReturn(Optional.empty());

        assertThatThrownBy(() -> scheduleService.delete(1L, 99L))
                .isInstanceOf(BusinessException.class)
                .extracting(e -> ((BusinessException) e).getErrorCode())
                .isEqualTo(ErrorCode.SCHEDULE_NOT_FOUND);
    }

    // --- helpers ---

    private User user(Long id) {
        User user = User.builder().email("u" + id + "@test.com").password("enc").name("user" + id).build();
        ReflectionTestUtils.setField(user, "id", id);
        return user;
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

    private Place place(Long id) {
        Place place = Place.builder()
                .googlePlaceId("g" + id).name("장소").address("주소")
                .latitude(37.0).longitude(127.0).types("cafe")
                .build();
        ReflectionTestUtils.setField(place, "id", id);
        return place;
    }

    private Schedule scheduleBuilder(TravelGroup group, Place place, User user, LocalDate date, int orderIndex) {
        return Schedule.builder()
                .travelGroup(group).place(place).scheduleDate(date).orderIndex(orderIndex)
                .startTime(LocalTime.of(9, 0)).endTime(LocalTime.of(10, 0))
                .status(ScheduleStatus.PLANNED).createdBy(user).updatedBy(user)
                .build();
    }
}
