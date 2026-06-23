package com.enjoytrip.backend.domain.accommodation.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.util.ReflectionTestUtils;

import com.enjoytrip.backend.domain.accommodation.dto.AccommodationResponse;
import com.enjoytrip.backend.domain.accommodation.dto.AccommodationSelectRequest;
import com.enjoytrip.backend.domain.accommodation.entity.Accommodation;
import com.enjoytrip.backend.domain.accommodation.entity.BookingStatus;
import com.enjoytrip.backend.domain.accommodation.repository.AccommodationRepository;
import com.enjoytrip.backend.domain.accommodation.service.AccommodationService.BookingPhoto;
import com.enjoytrip.backend.domain.auth.entity.User;
import com.enjoytrip.backend.domain.group.entity.GroupStatus;
import com.enjoytrip.backend.domain.group.entity.TravelGroup;
import com.enjoytrip.backend.domain.group.repository.TravelGroupRepository;
import com.enjoytrip.backend.domain.group.service.CurrentUserResolver;
import com.enjoytrip.backend.domain.group.service.GroupAccessValidator;
import com.enjoytrip.backend.domain.place.entity.Place;
import com.enjoytrip.backend.domain.place.service.PlaceService;
import com.enjoytrip.backend.global.exception.BusinessException;
import com.enjoytrip.backend.global.exception.ErrorCode;

class AccommodationServiceTest {

    private AccommodationRepository accommodationRepository;
    private TravelGroupRepository travelGroupRepository;
    private PlaceService placeService;
    private CurrentUserResolver currentUserResolver;
    private GroupAccessValidator groupAccessValidator;
    private AccommodationService service;

    @BeforeEach
    void setUp() {
        accommodationRepository = mock(AccommodationRepository.class);
        travelGroupRepository = mock(TravelGroupRepository.class);
        placeService = mock(PlaceService.class);
        currentUserResolver = mock(CurrentUserResolver.class);
        groupAccessValidator = mock(GroupAccessValidator.class);
        service = new AccommodationService(accommodationRepository, travelGroupRepository,
                placeService, currentUserResolver, groupAccessValidator);
    }

    @Test
    void selectCreatesAccommodationAndBuildsNaverSearchUrl() {
        when(currentUserResolver.getCurrentUser()).thenReturn(user());
        when(travelGroupRepository.findByIdAndDeletedAtIsNull(1L)).thenReturn(Optional.of(group()));
        when(placeService.resolvePlace("g1")).thenReturn(place("롯데호텔"));
        when(accommodationRepository.save(any(Accommodation.class))).thenAnswer(inv -> {
            Accommodation a = inv.getArgument(0);
            ReflectionTestUtils.setField(a, "id", 10L);
            return a;
        });

        AccommodationResponse res = service.select(1L, new AccommodationSelectRequest("g1", "용인시"));

        assertThat(res.id()).isEqualTo(10L);
        assertThat(res.status()).isEqualTo(BookingStatus.SELECTED);
        assertThat(res.place().name()).isEqualTo("롯데호텔");
        assertThat(res.sigungu()).isEqualTo("용인시");
        assertThat(res.bookingSearchUrl()).startsWith("https://search.naver.com/search.naver?query=");
        assertThat(res.bookingPhotoUrl()).isNull();
    }

    @Test
    void confirmBookingRejectsWhenNeitherPriceNorPhoto() {
        when(currentUserResolver.getCurrentUser()).thenReturn(user());
        when(accommodationRepository.findByIdAndTravelGroupId(10L, 1L))
                .thenReturn(Optional.of(accommodation("롯데호텔")));

        assertThatThrownBy(() -> service.confirmBooking(1L, 10L, null, null))
                .isInstanceOf(BusinessException.class)
                .extracting(e -> ((BusinessException) e).getErrorCode())
                .isEqualTo(ErrorCode.INVALID_INPUT);
    }

    @Test
    void confirmBookingWithPriceMarksBooked() {
        when(currentUserResolver.getCurrentUser()).thenReturn(user());
        when(accommodationRepository.findByIdAndTravelGroupId(10L, 1L))
                .thenReturn(Optional.of(accommodation("롯데호텔")));

        AccommodationResponse res = service.confirmBooking(1L, 10L, 250000L, null);

        assertThat(res.status()).isEqualTo(BookingStatus.BOOKED);
        assertThat(res.reservationPrice()).isEqualTo(250000L);
    }

    @Test
    void confirmBookingWithPhotoStoresImageAndExposesPhotoUrl() {
        when(currentUserResolver.getCurrentUser()).thenReturn(user());
        Accommodation acc = accommodation("롯데호텔");
        when(accommodationRepository.findByIdAndTravelGroupId(10L, 1L)).thenReturn(Optional.of(acc));
        MockMultipartFile photo = new MockMultipartFile(
                "photo", "booking.png", "image/png", new byte[]{1, 2, 3, 4});

        AccommodationResponse res = service.confirmBooking(1L, 10L, null, photo);

        assertThat(res.status()).isEqualTo(BookingStatus.BOOKED);
        assertThat(res.bookingPhotoUrl()).isEqualTo("/api/groups/1/accommodations/10/photo");
        assertThat(acc.hasPhoto()).isTrue();
    }

    @Test
    void confirmBookingRejectsNonImageFile() {
        when(currentUserResolver.getCurrentUser()).thenReturn(user());
        when(accommodationRepository.findByIdAndTravelGroupId(10L, 1L))
                .thenReturn(Optional.of(accommodation("롯데호텔")));
        MockMultipartFile pdf = new MockMultipartFile(
                "photo", "booking.pdf", "application/pdf", new byte[]{1, 2, 3});

        assertThatThrownBy(() -> service.confirmBooking(1L, 10L, null, pdf))
                .isInstanceOf(BusinessException.class)
                .extracting(e -> ((BusinessException) e).getErrorCode())
                .isEqualTo(ErrorCode.INVALID_FILE_TYPE);
    }

    @Test
    void loadPhotoReturnsStoredBytes() {
        when(currentUserResolver.getCurrentUser()).thenReturn(user());
        Accommodation acc = accommodation("롯데호텔");
        acc.markBooked(null, new byte[]{9, 9, 9}, "image/jpeg");
        when(accommodationRepository.findByIdAndTravelGroupId(10L, 1L)).thenReturn(Optional.of(acc));

        BookingPhoto photo = service.loadPhoto(1L, 10L);

        assertThat(photo.data()).containsExactly(9, 9, 9);
        assertThat(photo.contentType()).isEqualTo("image/jpeg");
    }

    @Test
    void loadPhotoMissingThrowsNotFound() {
        when(currentUserResolver.getCurrentUser()).thenReturn(user());
        when(accommodationRepository.findByIdAndTravelGroupId(10L, 1L))
                .thenReturn(Optional.of(accommodation("롯데호텔"))); // 사진 없음

        assertThatThrownBy(() -> service.loadPhoto(1L, 10L))
                .isInstanceOf(BusinessException.class)
                .extracting(e -> ((BusinessException) e).getErrorCode())
                .isEqualTo(ErrorCode.NOT_FOUND);
    }

    // --- helpers ---

    private User user() {
        User user = User.builder().email("u@test.com").password("enc").name("user").build();
        ReflectionTestUtils.setField(user, "id", 1L);
        return user;
    }

    private TravelGroup group() {
        TravelGroup group = TravelGroup.builder()
                .title("Trip").destination("경기도 용인시")
                .startDate(LocalDate.of(2026, 7, 1)).endDate(LocalDate.of(2026, 7, 3))
                .inviteCode("ABC123").status(GroupStatus.PLANNING)
                .build();
        ReflectionTestUtils.setField(group, "id", 1L);
        return group;
    }

    private Place place(String name) {
        Place place = Place.builder()
                .googlePlaceId("g1").name(name).address("주소")
                .latitude(37.5).longitude(127.0).types("lodging")
                .build();
        ReflectionTestUtils.setField(place, "id", 100L);
        return place;
    }

    private Accommodation accommodation(String placeName) {
        Accommodation acc = Accommodation.builder()
                .travelGroup(group()).place(place(placeName)).createdBy(user())
                .sigungu("용인시").status(BookingStatus.SELECTED)
                .build();
        ReflectionTestUtils.setField(acc, "id", 10L);
        return acc;
    }
}
