package com.enjoytrip.backend.domain.recommend.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import com.enjoytrip.backend.domain.auth.entity.User;
import com.enjoytrip.backend.domain.group.entity.GroupStatus;
import com.enjoytrip.backend.domain.group.entity.TravelGroup;
import com.enjoytrip.backend.domain.group.repository.TravelGroupRepository;
import com.enjoytrip.backend.domain.group.service.CurrentUserResolver;
import com.enjoytrip.backend.domain.group.service.GroupAccessValidator;
import com.enjoytrip.backend.domain.place.client.GooglePlace;
import com.enjoytrip.backend.domain.place.client.GooglePlacePage;
import com.enjoytrip.backend.domain.place.client.GooglePlacesClient;
import com.enjoytrip.backend.domain.recommend.client.TourApiClient;
import com.enjoytrip.backend.domain.recommend.client.TourSpot;
import com.enjoytrip.backend.domain.recommend.dto.RecommendationResponse;
import com.enjoytrip.backend.domain.recommend.entity.RecommendationCache;
import com.enjoytrip.backend.domain.recommend.repository.RecommendationCacheRepository;
import com.enjoytrip.backend.domain.survey.dto.GroupPersonaResponse;
import com.enjoytrip.backend.domain.survey.dto.GroupPersonaResponse.PersonaVector;
import com.enjoytrip.backend.domain.survey.service.GroupPersonaService;
import com.enjoytrip.backend.global.exception.BusinessException;
import com.enjoytrip.backend.global.exception.ErrorCode;
import com.fasterxml.jackson.databind.ObjectMapper;

class RecommendServiceTest {

    private TourApiClient tourApiClient;
    private RecommendationCacheRepository recommendationCacheRepository;
    private TravelGroupRepository travelGroupRepository;
    private GroupPersonaService groupPersonaService;
    private CurrentUserResolver currentUserResolver;
    private GroupAccessValidator groupAccessValidator;
    private GooglePlacesClient googlePlacesClient;
    private final ObjectMapper objectMapper = new ObjectMapper();
    private RecommendService recommendService;

    @BeforeEach
    void setUp() {
        tourApiClient = mock(TourApiClient.class);
        recommendationCacheRepository = mock(RecommendationCacheRepository.class);
        travelGroupRepository = mock(TravelGroupRepository.class);
        groupPersonaService = mock(GroupPersonaService.class);
        currentUserResolver = mock(CurrentUserResolver.class);
        groupAccessValidator = mock(GroupAccessValidator.class);
        googlePlacesClient = mock(GooglePlacesClient.class);
        recommendService = new RecommendService(
                tourApiClient, recommendationCacheRepository, travelGroupRepository,
                groupPersonaService, currentUserResolver, groupAccessValidator, googlePlacesClient);
    }

    @Test
    void ranksByCosineSimilarityToGroupPersona() {
        when(currentUserResolver.getCurrentUser()).thenReturn(user());
        when(travelGroupRepository.findByIdAndDeletedAtIsNull(1L)).thenReturn(Optional.of(group("서울특별시 강남구")));
        when(recommendationCacheRepository.findByCacheKey(anyString())).thenReturn(Optional.empty());
        when(tourApiClient.getAreaBasedList(eq(1), any(), anyInt())).thenReturn(List.of(
                spot("c1", "박물관", 14),   // 문화
                spot("c2", "맛집", 39)));   // 음식점
        // 먹거리(food)에 치우친 그룹 성향 → 음식점이 먼저 와야 한다.
        when(groupPersonaService.getGroupPersona(1L)).thenReturn(
                persona(new PersonaVector(0.2, 0.95, 0.3, 0.3, 0.5)));

        List<RecommendationResponse> result = recommendService.recommend(1L, null);

        assertThat(result).hasSize(2);
        assertThat(result.get(0).contentId()).isEqualTo("c2"); // 음식점 우선
        assertThat(result.get(0).matchScore()).isGreaterThanOrEqualTo(result.get(1).matchScore());
        verify(recommendationCacheRepository).save(any(RecommendationCache.class));
    }

    @Test
    void returnsTourApiOrderWhenNoPersona() {
        when(currentUserResolver.getCurrentUser()).thenReturn(user());
        when(travelGroupRepository.findByIdAndDeletedAtIsNull(1L)).thenReturn(Optional.of(group("부산광역시 해운대구")));
        when(recommendationCacheRepository.findByCacheKey(anyString())).thenReturn(Optional.empty());
        when(tourApiClient.getAreaBasedList(eq(6), any(), anyInt())).thenReturn(List.of(
                spot("a", "해수욕장", 12), spot("b", "시장", 38)));
        when(groupPersonaService.getGroupPersona(1L)).thenReturn(persona(null)); // 응답자 없음

        List<RecommendationResponse> result = recommendService.recommend(1L, null);

        assertThat(result).extracting(RecommendationResponse::contentId).containsExactly("a", "b");
        assertThat(result.get(0).matchScore()).isNull();
    }

    @Test
    void usesCacheWithoutCallingTourApi() throws Exception {
        when(currentUserResolver.getCurrentUser()).thenReturn(user());
        when(travelGroupRepository.findByIdAndDeletedAtIsNull(1L)).thenReturn(Optional.of(group("제주특별자치도 제주시")));
        RecommendationCache cache = RecommendationCache.builder()
                .cacheKey("39|ALL")
                .resultJson(objectMapper.writeValueAsString(List.of(spot("z", "성산일출봉", 12))))
                .expiresAt(LocalDateTime.now().plusHours(1))
                .build();
        when(recommendationCacheRepository.findByCacheKey(anyString())).thenReturn(Optional.of(cache));
        when(groupPersonaService.getGroupPersona(1L)).thenReturn(persona(null));

        List<RecommendationResponse> result = recommendService.recommend(1L, null);

        assertThat(result).hasSize(1);
        verify(tourApiClient, never()).getAreaBasedList(anyInt(), any(), anyInt());
        verify(recommendationCacheRepository, never()).save(any());
    }

    @Test
    void resolvesAreaFromBareCityNameWithoutSidoPrefix() {
        // "용인시"처럼 시/도 접두어 없이 시/군 이름만 저장된 destination도 경기(31)로 매칭돼야 한다.
        when(currentUserResolver.getCurrentUser()).thenReturn(user());
        when(travelGroupRepository.findByIdAndDeletedAtIsNull(1L)).thenReturn(Optional.of(group("용인시")));
        when(recommendationCacheRepository.findByCacheKey(anyString())).thenReturn(Optional.empty());
        when(tourApiClient.getAreaBasedList(eq(31), any(), anyInt())).thenReturn(List.of(spot("a", "에버랜드", 28)));
        when(groupPersonaService.getGroupPersona(1L)).thenReturn(persona(null));

        List<RecommendationResponse> result = recommendService.recommend(1L, null);

        assertThat(result).extracting(RecommendationResponse::contentId).containsExactly("a");
    }

    @Test
    void resolvesArbitraryPlaceNameViaGeocodingFallback() {
        // 정적 매핑에 없는 임의 지명은 Google 검색 주소의 시/도("서울특별시")로 areaCode(1)를 해석한다.
        when(currentUserResolver.getCurrentUser()).thenReturn(user());
        when(travelGroupRepository.findByIdAndDeletedAtIsNull(1L)).thenReturn(Optional.of(group("잠실한강공원")));
        when(recommendationCacheRepository.findByCacheKey(anyString())).thenReturn(Optional.empty());
        GooglePlace place = new GooglePlace("g1", "잠실한강공원", "대한민국 서울특별시 송파구 잠실동", 37.5, 127.0,
                List.of(), null, null, null, null, null, null, null, null);
        when(googlePlacesClient.searchText(eq("잠실한강공원"), any(), any()))
                .thenReturn(new GooglePlacePage(List.of(place), null));
        when(tourApiClient.getAreaBasedList(eq(1), any(), anyInt())).thenReturn(List.of(spot("a", "한강", 12)));
        when(groupPersonaService.getGroupPersona(1L)).thenReturn(persona(null));

        List<RecommendationResponse> result = recommendService.recommend(1L, null);

        assertThat(result).extracting(RecommendationResponse::contentId).containsExactly("a");
        verify(tourApiClient).getAreaBasedList(eq(1), any(), anyInt());
    }

    @Test
    void rejectsUnsupportedDestination() {
        when(currentUserResolver.getCurrentUser()).thenReturn(user());
        when(travelGroupRepository.findByIdAndDeletedAtIsNull(1L)).thenReturn(Optional.of(group("Tokyo Japan")));

        assertThatThrownBy(() -> recommendService.recommend(1L, null))
                .isInstanceOf(BusinessException.class)
                .extracting(e -> ((BusinessException) e).getErrorCode())
                .isEqualTo(ErrorCode.INVALID_INPUT);
    }

    // --- helpers ---

    private User user() {
        User user = User.builder().email("u@test.com").password("enc").name("user").build();
        ReflectionTestUtils.setField(user, "id", 1L);
        return user;
    }

    private TravelGroup group(String destination) {
        TravelGroup group = TravelGroup.builder()
                .title("Trip").destination(destination)
                .startDate(LocalDate.of(2026, 7, 1)).endDate(LocalDate.of(2026, 7, 3))
                .inviteCode("ABC123").status(GroupStatus.PLANNING)
                .build();
        ReflectionTestUtils.setField(group, "id", 1L);
        return group;
    }

    private TourSpot spot(String id, String title, int contentTypeId) {
        return new TourSpot(id, title, "주소", 37.5, 127.0, contentTypeId, "http://img");
    }

    private GroupPersonaResponse persona(PersonaVector average) {
        return new GroupPersonaResponse(3, average == null ? 0 : 3, average, null, null, null);
    }
}
