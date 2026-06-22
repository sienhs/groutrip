package com.enjoytrip.backend.domain.schedule.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyDouble;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.Optional;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import com.enjoytrip.backend.domain.auth.entity.User;
import com.enjoytrip.backend.domain.group.entity.GroupStatus;
import com.enjoytrip.backend.domain.group.entity.TravelGroup;
import com.enjoytrip.backend.domain.group.service.CurrentUserResolver;
import com.enjoytrip.backend.domain.group.service.GroupAccessValidator;
import com.enjoytrip.backend.domain.place.entity.Place;
import com.enjoytrip.backend.domain.schedule.client.KakaoDirections;
import com.enjoytrip.backend.domain.schedule.client.KakaoMobilityClient;
import com.enjoytrip.backend.domain.schedule.dto.TransportLegResponse;
import com.enjoytrip.backend.domain.schedule.entity.Schedule;
import com.enjoytrip.backend.domain.schedule.entity.ScheduleStatus;
import com.enjoytrip.backend.domain.schedule.entity.TransportLeg;
import com.enjoytrip.backend.domain.schedule.entity.TransportMode;
import com.enjoytrip.backend.domain.schedule.repository.ScheduleRepository;
import com.enjoytrip.backend.domain.schedule.repository.TransportLegRepository;

class TransportServiceTest {

    private KakaoMobilityClient kakaoMobilityClient;
    private TransportLegRepository transportLegRepository;
    private ScheduleRepository scheduleRepository;
    private CurrentUserResolver currentUserResolver;
    private GroupAccessValidator groupAccessValidator;
    private TransportService transportService;

    @BeforeEach
    void setUp() {
        kakaoMobilityClient = mock(KakaoMobilityClient.class);
        transportLegRepository = mock(TransportLegRepository.class);
        scheduleRepository = mock(ScheduleRepository.class);
        currentUserResolver = mock(CurrentUserResolver.class);
        groupAccessValidator = mock(GroupAccessValidator.class);
        transportService = new TransportService(
                kakaoMobilityClient, transportLegRepository, scheduleRepository,
                currentUserResolver, groupAccessValidator);
    }

    @Test
    void carLegComputesFuelCostAndCarTotal() {
        stubSchedules();
        when(currentUserResolver.getCurrentUser()).thenReturn(user());
        when(transportLegRepository.findByCacheKey(anyString())).thenReturn(Optional.empty());
        when(transportLegRepository.save(any(TransportLeg.class))).thenAnswer(inv -> inv.getArgument(0));
        // 15km, 20분, 톨비 1000, 택시 17000
        when(kakaoMobilityClient.getCarDirections(anyDouble(), anyDouble(), anyDouble(), anyDouble()))
                .thenReturn(new KakaoDirections(15000, 1200, 1000, 17000));

        TransportLegResponse response = transportService.getLeg(1L, 10L, 11L, TransportMode.CAR);

        assertThat(response.available()).isTrue();
        // 연료비 = 15km / 13km/L × 1700 = 1962원, 자동차 합계 = 톨비 + 연료비
        assertThat(response.fuelCost()).isEqualTo(1962);
        assertThat(response.carCost()).isEqualTo(2962);
        assertThat(response.taxiFare()).isEqualTo(17000);
        assertThat(response.durationMinutes()).isEqualTo(20);
    }

    @Test
    void walkLegEstimatesFromCoordinatesWithoutKakao() {
        stubSchedules();
        when(currentUserResolver.getCurrentUser()).thenReturn(user());
        when(transportLegRepository.findByCacheKey(anyString())).thenReturn(Optional.empty());
        when(transportLegRepository.save(any(TransportLeg.class))).thenAnswer(inv -> inv.getArgument(0));

        TransportLegResponse response = transportService.getLeg(1L, 10L, 11L, TransportMode.WALK);

        assertThat(response.available()).isTrue();
        assertThat(response.distanceMeters()).isPositive();
        assertThat(response.fuelCost()).isNull();
        assertThat(response.note()).contains("도보");
        verify(kakaoMobilityClient, never()).getCarDirections(anyDouble(), anyDouble(), anyDouble(), anyDouble());
    }

    @Test
    void transitLegIsUnavailable() {
        stubSchedules();
        when(currentUserResolver.getCurrentUser()).thenReturn(user());
        when(transportLegRepository.findByCacheKey(anyString())).thenReturn(Optional.empty());
        when(transportLegRepository.save(any(TransportLeg.class))).thenAnswer(inv -> inv.getArgument(0));

        TransportLegResponse response = transportService.getLeg(1L, 10L, 11L, TransportMode.TRANSIT);

        assertThat(response.available()).isFalse();
        assertThat(response.note()).contains("대중교통");
    }

    @Test
    void returnsCachedLegWithinTtlWithoutCallingKakao() {
        stubSchedules();
        when(currentUserResolver.getCurrentUser()).thenReturn(user());
        TransportLeg cached = TransportLeg.builder()
                .cacheKey("any").mode(TransportMode.CAR).available(true)
                .durationSeconds(600).distanceMeters(5000).toll(0).fuelCost(654).taxiFare(8000)
                .expiresAt(LocalDateTime.now().plusMinutes(30))
                .build();
        when(transportLegRepository.findByCacheKey(anyString())).thenReturn(Optional.of(cached));

        TransportLegResponse response = transportService.getLeg(1L, 10L, 11L, TransportMode.CAR);

        assertThat(response.carCost()).isEqualTo(654); // toll 0 + fuel 654
        verify(kakaoMobilityClient, never()).getCarDirections(anyDouble(), anyDouble(), anyDouble(), anyDouble());
        verify(transportLegRepository, never()).save(any());
    }

    // --- helpers ---

    private void stubSchedules() {
        when(scheduleRepository.findByIdAndTravelGroupId(10L, 1L))
                .thenReturn(Optional.of(schedule(place(37.5, 127.0))));
        when(scheduleRepository.findByIdAndTravelGroupId(11L, 1L))
                .thenReturn(Optional.of(schedule(place(37.4, 127.1))));
    }

    private User user() {
        User user = User.builder().email("u@test.com").password("enc").name("user").build();
        ReflectionTestUtils.setField(user, "id", 1L);
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

    private Place place(double lat, double lng) {
        Place place = Place.builder()
                .googlePlaceId("g").name("장소").address("주소")
                .latitude(lat).longitude(lng).types("cafe")
                .build();
        ReflectionTestUtils.setField(place, "id", 5L);
        return place;
    }

    private Schedule schedule(Place place) {
        return Schedule.builder()
                .travelGroup(group()).place(place).scheduleDate(LocalDate.of(2026, 7, 1)).orderIndex(0)
                .startTime(LocalTime.of(9, 0)).endTime(LocalTime.of(10, 0))
                .status(ScheduleStatus.PLANNED).createdBy(user()).updatedBy(user())
                .build();
    }
}
