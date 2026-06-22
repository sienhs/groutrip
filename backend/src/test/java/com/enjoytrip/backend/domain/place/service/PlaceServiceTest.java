package com.enjoytrip.backend.domain.place.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.test.util.ReflectionTestUtils;

import com.enjoytrip.backend.domain.auth.entity.User;
import com.enjoytrip.backend.domain.group.entity.GroupMember;
import com.enjoytrip.backend.domain.group.entity.GroupRole;
import com.enjoytrip.backend.domain.group.entity.GroupStatus;
import com.enjoytrip.backend.domain.group.entity.TravelGroup;
import com.enjoytrip.backend.domain.group.repository.TravelGroupRepository;
import com.enjoytrip.backend.domain.group.service.CurrentUserResolver;
import com.enjoytrip.backend.domain.group.service.GroupAccessValidator;
import com.enjoytrip.backend.domain.place.client.GooglePlace;
import com.enjoytrip.backend.domain.place.client.GooglePlacePage;
import com.enjoytrip.backend.domain.place.client.GooglePlacesClient;
import com.enjoytrip.backend.domain.place.dto.BookmarkCreateRequest;
import com.enjoytrip.backend.domain.place.dto.BookmarkResponse;
import com.enjoytrip.backend.domain.place.dto.BookmarkSort;
import com.enjoytrip.backend.domain.place.dto.BookmarkUpdateRequest;
import com.enjoytrip.backend.domain.place.dto.PlaceSearchPage;
import com.enjoytrip.backend.domain.place.dto.PlaceSearchResult;
import com.enjoytrip.backend.domain.place.entity.Bookmark;
import com.enjoytrip.backend.domain.place.entity.Place;
import com.enjoytrip.backend.domain.place.entity.PlaceCategory;
import com.enjoytrip.backend.domain.place.entity.PlaceSearchCache;
import com.enjoytrip.backend.domain.place.repository.BookmarkRepository;
import com.enjoytrip.backend.domain.place.repository.PlaceRepository;
import com.enjoytrip.backend.domain.place.repository.PlaceSearchCacheRepository;
import com.enjoytrip.backend.global.event.DomainEvent;
import com.enjoytrip.backend.global.exception.BusinessException;
import com.enjoytrip.backend.global.exception.ErrorCode;
import com.fasterxml.jackson.databind.ObjectMapper;

class PlaceServiceTest {

    private GooglePlacesClient googlePlacesClient;
    private PlaceRepository placeRepository;
    private BookmarkRepository bookmarkRepository;
    private PlaceSearchCacheRepository placeSearchCacheRepository;
    private TravelGroupRepository travelGroupRepository;
    private CurrentUserResolver currentUserResolver;
    private GroupAccessValidator groupAccessValidator;
    private ApplicationEventPublisher eventPublisher;
    private final ObjectMapper objectMapper = new ObjectMapper();
    private PlaceService placeService;

    @BeforeEach
    void setUp() {
        googlePlacesClient = mock(GooglePlacesClient.class);
        placeRepository = mock(PlaceRepository.class);
        bookmarkRepository = mock(BookmarkRepository.class);
        placeSearchCacheRepository = mock(PlaceSearchCacheRepository.class);
        travelGroupRepository = mock(TravelGroupRepository.class);
        currentUserResolver = mock(CurrentUserResolver.class);
        groupAccessValidator = mock(GroupAccessValidator.class);
        eventPublisher = mock(ApplicationEventPublisher.class);
        placeService = new PlaceService(
                googlePlacesClient,
                placeRepository,
                bookmarkRepository,
                placeSearchCacheRepository,
                travelGroupRepository,
                currentUserResolver,
                groupAccessValidator,
                eventPublisher
        );
    }

    @Test
    void searchReturnsCachedResultWithoutCallingGoogle() throws Exception {
        User user = user(1L, "member");
        when(currentUserResolver.getCurrentUser()).thenReturn(user);
        when(groupAccessValidator.validateMember(1L, 1L)).thenReturn(member(group(1L), user, GroupRole.MEMBER));

        PlaceSearchResult cachedResult = new PlaceSearchResult(
                "place-1", "강남 카페", "CAFE", "서울 강남구", 37.5, 127.0,
                List.of("cafe"), 4.5, 100, "PRICE_LEVEL_MODERATE", null, "https://maps.google.com/x");
        PlaceSearchCache cache = PlaceSearchCache.builder()
                .cacheKey("q=강남 카페|c=CAFE|r=kr|p=0")
                .resultJson(objectMapper.writeValueAsString(new PlaceSearchPage(List.of(cachedResult), "token-2")))
                .expiresAt(LocalDateTime.now().plusHours(1)) // 만료되지 않은 캐시
                .build();
        when(placeSearchCacheRepository.findByCacheKey(anyString())).thenReturn(Optional.of(cache));

        PlaceSearchPage page = placeService.search(1L, "강남 카페", PlaceCategory.CAFE, null);

        assertThat(page.results()).hasSize(1);
        assertThat(page.results().get(0).googlePlaceId()).isEqualTo("place-1");
        assertThat(page.nextPageToken()).isEqualTo("token-2"); // 캐시에 저장된 다음 페이지 토큰 보존
        verify(googlePlacesClient, never()).searchText(anyString(), any(), any());
        verify(placeSearchCacheRepository, never()).save(any());
    }

    @Test
    void searchCallsGoogleOnCacheMissAndStoresCache() {
        User user = user(1L, "member");
        when(currentUserResolver.getCurrentUser()).thenReturn(user);
        when(groupAccessValidator.validateMember(1L, 1L)).thenReturn(member(group(1L), user, GroupRole.MEMBER));
        when(placeSearchCacheRepository.findByCacheKey(anyString())).thenReturn(Optional.empty());
        when(googlePlacesClient.searchText("제주 흑돼지", "restaurant", null)).thenReturn(new GooglePlacePage(List.of(
                new GooglePlace("place-2", "흑돼지집", "제주시", 33.4, 126.5,
                        List.of("restaurant", "food"), 4.2, 50, "PRICE_LEVEL_MODERATE",
                        "places/place-2/photos/ref", "https://maps.google.com/y", null, null, null)),
                "next-token"));

        PlaceSearchPage page = placeService.search(1L, "제주 흑돼지", PlaceCategory.RESTAURANT, null);

        assertThat(page.results()).hasSize(1);
        assertThat(page.results().get(0).category()).isEqualTo("RESTAURANT"); // Google types 역매핑 결과
        assertThat(page.results().get(0).photoUrl()).startsWith("/api/places/photo?name="); // 키 미노출 프록시 경로
        assertThat(page.nextPageToken()).isEqualTo("next-token");
        verify(googlePlacesClient).searchText("제주 흑돼지", "restaurant", null);
        verify(placeSearchCacheRepository).save(any(PlaceSearchCache.class));
    }

    @Test
    void searchRejectsBlankQuery() {
        User user = user(1L, "member");
        when(currentUserResolver.getCurrentUser()).thenReturn(user);
        when(groupAccessValidator.validateMember(1L, 1L)).thenReturn(member(group(1L), user, GroupRole.MEMBER));

        assertThatThrownBy(() -> placeService.search(1L, "  ", null, null))
                .isInstanceOf(BusinessException.class)
                .extracting(e -> ((BusinessException) e).getErrorCode())
                .isEqualTo(ErrorCode.INVALID_INPUT);
    }

    @Test
    void addBookmarkRejectsDuplicatePlaceInSameGroup() {
        User user = user(1L, "member");
        TravelGroup group = group(1L);
        Place place = place(100L, "place-9", LocalDateTime.now()); // Details 캐시 신선 → getDetails 미호출

        when(currentUserResolver.getCurrentUser()).thenReturn(user);
        when(groupAccessValidator.validateMember(1L, 1L)).thenReturn(member(group, user, GroupRole.MEMBER));
        when(travelGroupRepository.findByIdAndDeletedAtIsNull(1L)).thenReturn(Optional.of(group));
        when(placeRepository.findByGooglePlaceId("place-9")).thenReturn(Optional.of(place));
        when(bookmarkRepository.existsByTravelGroupIdAndPlaceId(1L, 100L)).thenReturn(true);

        BookmarkCreateRequest request = new BookmarkCreateRequest("place-9", PlaceCategory.CAFE, "메모", 4);

        assertThatThrownBy(() -> placeService.addBookmark(1L, request))
                .isInstanceOf(BusinessException.class)
                .extracting(e -> ((BusinessException) e).getErrorCode())
                .isEqualTo(ErrorCode.PLACE_ALREADY_BOOKMARKED);

        verify(googlePlacesClient, never()).getDetails(anyString());
        verify(eventPublisher, never()).publishEvent(any());
    }

    @Test
    void addBookmarkFetchesDetailsForNewPlaceAndPublishesEvent() {
        User user = user(1L, "member");
        TravelGroup group = group(1L);

        when(currentUserResolver.getCurrentUser()).thenReturn(user);
        when(groupAccessValidator.validateMember(1L, 1L)).thenReturn(member(group, user, GroupRole.MEMBER));
        when(travelGroupRepository.findByIdAndDeletedAtIsNull(1L)).thenReturn(Optional.of(group));
        when(placeRepository.findByGooglePlaceId("place-new")).thenReturn(Optional.empty());
        when(googlePlacesClient.getDetails("place-new")).thenReturn(
                new GooglePlace("place-new", "신상 카페", "서울", 37.1, 127.1,
                        List.of("cafe"), 4.8, 10, "PRICE_LEVEL_INEXPENSIVE",
                        "places/place-new/photos/ref", "https://maps.google.com/z",
                        "02-123-4567", "월-금 09:00~21:00", "https://cafe.example.com"));
        when(placeRepository.save(any(Place.class))).thenAnswer(invocation -> {
            Place saved = invocation.getArgument(0);
            ReflectionTestUtils.setField(saved, "id", 200L);
            return saved;
        });
        when(bookmarkRepository.existsByTravelGroupIdAndPlaceId(1L, 200L)).thenReturn(false);
        when(bookmarkRepository.save(any(Bookmark.class))).thenAnswer(invocation -> {
            Bookmark saved = invocation.getArgument(0);
            ReflectionTestUtils.setField(saved, "id", 300L);
            return saved;
        });

        BookmarkCreateRequest request = new BookmarkCreateRequest("place-new", PlaceCategory.CAFE, "가보고 싶음", 5);

        BookmarkResponse response = placeService.addBookmark(1L, request);

        assertThat(response.id()).isEqualTo(300L);
        assertThat(response.place().googlePlaceId()).isEqualTo("place-new");
        assertThat(response.place().phoneNumber()).isEqualTo("02-123-4567"); // Details 보강 확인
        verify(googlePlacesClient).getDetails("place-new");
        verify(eventPublisher).publishEvent(any(DomainEvent.class));
    }

    @Test
    void updateBookmarkRejectsNonOwnerNonCreator() {
        User actor = user(2L, "other-member");
        Bookmark bookmark = bookmark(50L, group(1L), place(100L, "place-9", LocalDateTime.now()),
                user(1L, "creator"));

        when(currentUserResolver.getCurrentUser()).thenReturn(actor);
        when(groupAccessValidator.validateMember(1L, 2L))
                .thenReturn(member(group(1L), actor, GroupRole.MEMBER)); // Owner도 작성자도 아님
        when(bookmarkRepository.findByIdAndTravelGroupId(50L, 1L)).thenReturn(Optional.of(bookmark));

        BookmarkUpdateRequest request = new BookmarkUpdateRequest(PlaceCategory.RESTAURANT, "수정", 3);

        assertThatThrownBy(() -> placeService.updateBookmark(1L, 50L, request))
                .isInstanceOf(BusinessException.class)
                .extracting(e -> ((BusinessException) e).getErrorCode())
                .isEqualTo(ErrorCode.GROUP_OWNER_REQUIRED);
    }

    @Test
    void deleteBookmarkByCreatorPublishesRemovedEvent() {
        User creator = user(1L, "creator");
        Bookmark bookmark = bookmark(50L, group(1L), place(100L, "place-9", LocalDateTime.now()), creator);

        when(currentUserResolver.getCurrentUser()).thenReturn(creator);
        when(groupAccessValidator.validateMember(1L, 1L))
                .thenReturn(member(group(1L), creator, GroupRole.MEMBER));
        when(bookmarkRepository.findByIdAndTravelGroupId(50L, 1L)).thenReturn(Optional.of(bookmark));

        placeService.deleteBookmark(1L, 50L);

        verify(bookmarkRepository, times(1)).delete(bookmark);
        verify(eventPublisher).publishEvent(any(DomainEvent.class));
    }

    // --- helpers ---

    private TravelGroup group(Long id) {
        TravelGroup group = TravelGroup.builder()
                .title("Trip").destination("Seoul")
                .startDate(java.time.LocalDate.of(2026, 7, 1))
                .endDate(java.time.LocalDate.of(2026, 7, 3))
                .inviteCode("ABC123").status(GroupStatus.PLANNING)
                .build();
        ReflectionTestUtils.setField(group, "id", id);
        return group;
    }

    private User user(Long id, String name) {
        User user = User.builder().email(name + "@test.com").password("encoded").name(name).build();
        ReflectionTestUtils.setField(user, "id", id);
        return user;
    }

    private GroupMember member(TravelGroup group, User user, GroupRole role) {
        GroupMember member = GroupMember.builder().travelGroup(group).user(user).role(role).build();
        ReflectionTestUtils.setField(member, "id", user.getId());
        return member;
    }

    private Place place(Long id, String googlePlaceId, LocalDateTime detailsFetchedAt) {
        Place place = Place.builder()
                .googlePlaceId(googlePlaceId).name("place").address("addr")
                .latitude(37.0).longitude(127.0).types("cafe")
                .detailsFetchedAt(detailsFetchedAt)
                .build();
        ReflectionTestUtils.setField(place, "id", id);
        return place;
    }

    private Bookmark bookmark(Long id, TravelGroup group, Place place, User createdBy) {
        Bookmark bookmark = Bookmark.builder()
                .travelGroup(group).place(place).createdBy(createdBy)
                .categoryTag(PlaceCategory.CAFE).memo("memo").personalRating(4)
                .build();
        ReflectionTestUtils.setField(bookmark, "id", id);
        return bookmark;
    }
}
