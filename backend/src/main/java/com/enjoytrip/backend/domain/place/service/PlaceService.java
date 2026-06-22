package com.enjoytrip.backend.domain.place.service;

import java.time.LocalDateTime;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.Optional;

import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.enjoytrip.backend.domain.auth.entity.User;
import com.enjoytrip.backend.domain.group.entity.GroupMember;
import com.enjoytrip.backend.domain.group.entity.TravelGroup;
import com.enjoytrip.backend.domain.group.repository.TravelGroupRepository;
import com.enjoytrip.backend.domain.group.service.CurrentUserResolver;
import com.enjoytrip.backend.domain.group.service.GroupAccessValidator;
import com.enjoytrip.backend.domain.place.client.GooglePlace;
import com.enjoytrip.backend.domain.place.client.GooglePlacePage;
import com.enjoytrip.backend.domain.place.client.GooglePlacesClient;
import com.enjoytrip.backend.domain.place.controller.PlacePhotoController;
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
import com.enjoytrip.backend.global.event.EventType;
import com.enjoytrip.backend.global.exception.BusinessException;
import com.enjoytrip.backend.global.exception.ErrorCode;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
@Transactional
public class PlaceService {

    private static final String REGION_CODE = "kr";
    private static final int SEARCH_CACHE_HOURS = 24; // NFR-PERF: 검색 결과 24시간 캐시

    private final GooglePlacesClient googlePlacesClient;
    private final PlaceRepository placeRepository;
    private final BookmarkRepository bookmarkRepository;
    private final PlaceSearchCacheRepository placeSearchCacheRepository;
    private final TravelGroupRepository travelGroupRepository;
    private final CurrentUserResolver currentUserResolver;
    private final GroupAccessValidator groupAccessValidator;
    private final ApplicationEventPublisher eventPublisher;
    // 내부 캐시 JSON 직렬화 전용. Spring Boot 4는 Jackson 3 ObjectMapper 빈만 제공하므로 직접 생성한다.
    private final ObjectMapper objectMapper = new ObjectMapper();

    /**
     * FR-PLACE-01: Google Places 단일 소스 검색.
     * 동일 (검색어+카테고리+지역+페이지) 조합은 24시간 DB 캐시를 우선 사용하고, 미스/만료 시에만 Google을 호출한다.
     * pageToken으로 다음 페이지를 조회하며, 결과 페이지(결과 + 다음 토큰)를 반환한다.
     */
    public PlaceSearchPage search(Long groupId, String query, PlaceCategory category, String pageToken) {
        User user = currentUserResolver.getCurrentUser();
        groupAccessValidator.validateMember(groupId, user.getId());

        if (query == null || query.isBlank()) {
            throw new BusinessException(ErrorCode.INVALID_INPUT);
        }

        String cacheKey = cacheKey(query, category, pageToken);
        LocalDateTime now = LocalDateTime.now();

        Optional<PlaceSearchCache> cached = placeSearchCacheRepository.findByCacheKey(cacheKey);
        if (cached.isPresent() && !cached.get().isExpired(now)) {
            return deserialize(cached.get().getResultJson());
        }

        String includedType = (category != null && category.hasIncludedType())
                ? category.getIncludedType()
                : null;
        GooglePlacePage raw = googlePlacesClient.searchText(query, includedType, pageToken);
        List<PlaceSearchResult> results = raw.places().stream()
                .map(this::toSearchResult)
                .toList();
        PlaceSearchPage page = new PlaceSearchPage(results, raw.nextPageToken());

        String json = serialize(page);
        LocalDateTime expiresAt = now.plusHours(SEARCH_CACHE_HOURS);
        cached.ifPresentOrElse(
                cache -> cache.refresh(json, expiresAt),
                () -> placeSearchCacheRepository.save(PlaceSearchCache.builder()
                        .cacheKey(cacheKey)
                        .resultJson(json)
                        .expiresAt(expiresAt)
                        .build())
        );
        return page;
    }

    /**
     * FR-PLACE-02: 보관함 추가.
     * 추가 시점에만 Place Details를 호출해 장소 마스터를 보강하고, 같은 그룹 내 중복 장소는 거부한다.
     */
    public BookmarkResponse addBookmark(Long groupId, BookmarkCreateRequest request) {
        User user = currentUserResolver.getCurrentUser();
        groupAccessValidator.validateMember(groupId, user.getId());
        TravelGroup group = travelGroupRepository.findByIdAndDeletedAtIsNull(groupId)
                .orElseThrow(() -> new BusinessException(ErrorCode.GROUP_NOT_FOUND));

        Place place = resolvePlaceWithDetails(request.googlePlaceId());
        if (bookmarkRepository.existsByTravelGroupIdAndPlaceId(groupId, place.getId())) {
            throw new BusinessException(ErrorCode.PLACE_ALREADY_BOOKMARKED);
        }

        Bookmark bookmark = bookmarkRepository.save(Bookmark.builder()
                .travelGroup(group)
                .place(place)
                .createdBy(user)
                .categoryTag(request.categoryTag())
                .memo(request.memo())
                .personalRating(request.personalRating())
                .build());

        BookmarkResponse response = toResponse(bookmark);
        // FR-SSE-02: SSE 브리지가 구독할 수 있도록 PLACE_BOOKMARKED를 application event로 발행한다.
        eventPublisher.publishEvent(
                DomainEvent.of(EventType.PLACE_BOOKMARKED, groupId, user.getId(), response));
        return response;
    }

    /**
     * FR-PLACE-03: 보관함 조회. 카테고리/추가자/가격대 필터와 정렬을 적용한다.
     */
    @Transactional(readOnly = true)
    public List<BookmarkResponse> getBookmarks(Long groupId, PlaceCategory category,
                                               Long creatorId, String priceLevel, BookmarkSort sort) {
        User user = currentUserResolver.getCurrentUser();
        groupAccessValidator.validateMember(groupId, user.getId());

        return bookmarkRepository.findByTravelGroupId(groupId).stream()
                .filter(b -> category == null || b.getCategoryTag() == category)
                .filter(b -> creatorId == null || b.getCreatedBy().getId().equals(creatorId))
                .filter(b -> priceLevel == null || priceLevel.equals(b.getPlace().getPriceLevel()))
                .sorted(comparator(sort))
                .map(this::toResponse)
                .toList();
    }

    /**
     * FR-PLACE-04: 보관함 수정. 추가자 본인 또는 그룹 Owner만 가능하다.
     */
    public BookmarkResponse updateBookmark(Long groupId, Long bookmarkId, BookmarkUpdateRequest request) {
        User user = currentUserResolver.getCurrentUser();
        GroupMember actor = groupAccessValidator.validateMember(groupId, user.getId());
        Bookmark bookmark = findBookmark(groupId, bookmarkId);
        validateWriterOrOwner(bookmark, actor, user.getId());

        bookmark.update(request.categoryTag(), request.memo(), request.personalRating());
        return toResponse(bookmark);
    }

    /**
     * FR-PLACE-04: 보관함 삭제. 추가자 본인 또는 그룹 Owner만 가능하다.
     */
    public void deleteBookmark(Long groupId, Long bookmarkId) {
        User user = currentUserResolver.getCurrentUser();
        GroupMember actor = groupAccessValidator.validateMember(groupId, user.getId());
        Bookmark bookmark = findBookmark(groupId, bookmarkId);
        validateWriterOrOwner(bookmark, actor, user.getId());

        bookmarkRepository.delete(bookmark);
        // FR-SSE-02: 삭제도 PLACE_REMOVED로 발행해 다른 멤버 화면과 동기화한다.
        eventPublisher.publishEvent(
                DomainEvent.of(EventType.PLACE_REMOVED, groupId, user.getId(), bookmarkId));
    }

    // FR-PLACE-02: 기존 마스터가 있으면서 Details 캐시(7일)가 유효하면 재사용하고, 아니면 Place Details로 갱신한다.
    private Place resolvePlaceWithDetails(String googlePlaceId) {
        LocalDateTime now = LocalDateTime.now();
        Optional<Place> existing = placeRepository.findByGooglePlaceId(googlePlaceId);
        if (existing.isPresent() && existing.get().isDetailsFresh(now)) {
            return existing.get();
        }

        GooglePlace detail = googlePlacesClient.getDetails(googlePlaceId);
        String types = String.join(",", detail.types());

        if (existing.isPresent()) {
            existing.get().refreshDetails(detail.name(), detail.address(), detail.latitude(),
                    detail.longitude(), types, detail.priceLevel(), detail.rating(), detail.ratingCount(),
                    detail.photoName(), detail.googleMapsUri(), detail.phoneNumber(), detail.openingHours(),
                    detail.websiteUri(), now);
            return existing.get();
        }

        return placeRepository.save(Place.builder()
                .googlePlaceId(detail.googlePlaceId())
                .name(detail.name())
                .address(detail.address())
                .latitude(detail.latitude())
                .longitude(detail.longitude())
                .types(types)
                .priceLevel(detail.priceLevel())
                .rating(detail.rating())
                .ratingCount(detail.ratingCount())
                .photoName(detail.photoName())
                .googleMapsUri(detail.googleMapsUri())
                .phoneNumber(detail.phoneNumber())
                .openingHours(detail.openingHours())
                .websiteUri(detail.websiteUri())
                .detailsFetchedAt(now)
                .build());
    }

    private Bookmark findBookmark(Long groupId, Long bookmarkId) {
        return bookmarkRepository.findByIdAndTravelGroupId(bookmarkId, groupId)
                .orElseThrow(() -> new BusinessException(ErrorCode.PLACE_NOT_FOUND));
    }

    // FR-PLACE-04: 추가자 본인이거나 그룹 Owner인 경우에만 수정/삭제를 허용한다.
    private void validateWriterOrOwner(Bookmark bookmark, GroupMember actor, Long userId) {
        if (bookmark.isOwnedBy(userId) || actor.isOwner()) {
            return;
        }
        throw new BusinessException(ErrorCode.GROUP_OWNER_REQUIRED);
    }

    private Comparator<Bookmark> comparator(BookmarkSort sort) {
        return switch (sort == null ? BookmarkSort.RECENT : sort) {
            case RATING -> Comparator.comparing(
                    b -> b.getPlace().getRating(),
                    Comparator.nullsLast(Comparator.reverseOrder()));
            case NAME -> Comparator.comparing(b -> b.getPlace().getName(), Comparator.nullsLast(Comparator.naturalOrder()));
            case RECENT -> Comparator.comparing(Bookmark::getCreatedAt, Comparator.reverseOrder());
        };
    }

    private PlaceSearchResult toSearchResult(GooglePlace place) {
        PlaceCategory category = PlaceCategory.fromGoogleTypes(place.types());
        return new PlaceSearchResult(
                place.googlePlaceId(),
                place.name(),
                category.name(),
                place.address(),
                place.latitude(),
                place.longitude(),
                place.types(),
                place.rating(),
                place.ratingCount(),
                place.priceLevel(),
                photoUrl(place.photoName()),
                place.googleMapsUri()
        );
    }

    private BookmarkResponse toResponse(Bookmark bookmark) {
        return BookmarkResponse.from(bookmark, photoUrl(bookmark.getPlace().getPhotoName()));
    }

    private String photoUrl(String photoName) {
        return photoName == null ? null : PlacePhotoController.proxyUrl(photoName);
    }

    // FR-PLACE-01: (검색어+카테고리+지역+페이지)을 정규화해 캐시 키를 만든다.
    private String cacheKey(String query, PlaceCategory category, String pageToken) {
        String normalizedQuery = query.trim().toLowerCase(Locale.KOREAN);
        String categoryKey = category == null ? "ALL" : category.name();
        String pageKey = (pageToken == null || pageToken.isBlank()) ? "0" : pageToken;
        return "q=" + normalizedQuery + "|c=" + categoryKey + "|r=" + REGION_CODE + "|p=" + pageKey;
    }

    private String serialize(PlaceSearchPage page) {
        try {
            return objectMapper.writeValueAsString(page);
        } catch (JsonProcessingException e) {
            throw new BusinessException(ErrorCode.INTERNAL_SERVER_ERROR);
        }
    }

    private PlaceSearchPage deserialize(String json) {
        try {
            return objectMapper.readValue(json, PlaceSearchPage.class);
        } catch (JsonProcessingException e) {
            throw new BusinessException(ErrorCode.INTERNAL_SERVER_ERROR);
        }
    }
}
