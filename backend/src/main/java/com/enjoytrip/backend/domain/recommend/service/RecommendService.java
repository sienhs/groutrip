package com.enjoytrip.backend.domain.recommend.service;

import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.enjoytrip.backend.domain.auth.entity.User;
import com.enjoytrip.backend.domain.group.entity.TravelGroup;
import com.enjoytrip.backend.domain.group.repository.TravelGroupRepository;
import com.enjoytrip.backend.domain.group.service.CurrentUserResolver;
import com.enjoytrip.backend.domain.group.service.GroupAccessValidator;
import com.enjoytrip.backend.domain.recommend.client.TourApiClient;
import com.enjoytrip.backend.domain.recommend.client.TourSpot;
import com.enjoytrip.backend.domain.recommend.dto.RecommendationResponse;
import com.enjoytrip.backend.domain.recommend.entity.RecommendationCache;
import com.enjoytrip.backend.domain.recommend.repository.RecommendationCacheRepository;
import com.enjoytrip.backend.domain.survey.dto.GroupPersonaResponse.PersonaVector;
import com.enjoytrip.backend.domain.survey.service.GroupPersonaService;
import com.enjoytrip.backend.global.exception.BusinessException;
import com.enjoytrip.backend.global.exception.ErrorCode;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;

import lombok.RequiredArgsConstructor;

/**
 * FR-RECOMMEND-01/02 (SHOULD): TourAPI 지역 기반 추천을 그룹 평균 성향과의 코사인 유사도로 정렬한다.
 * (지역 + 카테고리) 결과는 24시간 캐시한다.
 */
@Service
@RequiredArgsConstructor
@Transactional
public class RecommendService {

    private static final int FETCH_COUNT = 50;   // 정렬 풀
    private static final int TOP_N = 20;          // 상위 20개 표시
    private static final int CACHE_HOURS = 24;

    // 시/도 키워드 → TourAPI areaCode. 그룹 destination 문자열에 포함되는지로 매칭한다.
    private static final Map<String, Integer> AREA_CODES = new LinkedHashMap<>();

    // contentTypeId → 관광지 특성 5차원 벡터(activity, food, pace, urbanNature, timePref). 휴리스틱(튜닝 가능).
    private static final Map<Integer, double[]> ATTRACTION_VECTORS = new LinkedHashMap<>();
    private static final double[] NEUTRAL_VECTOR = {0.5, 0.5, 0.5, 0.5, 0.5};

    static {
        AREA_CODES.put("서울", 1);
        AREA_CODES.put("인천", 2);
        AREA_CODES.put("대전", 3);
        AREA_CODES.put("대구", 4);
        AREA_CODES.put("광주", 5);
        AREA_CODES.put("부산", 6);
        AREA_CODES.put("울산", 7);
        AREA_CODES.put("세종", 8);
        AREA_CODES.put("경기", 31);
        AREA_CODES.put("강원", 32);
        AREA_CODES.put("충청북", 33);
        AREA_CODES.put("충북", 33);
        AREA_CODES.put("충청남", 34);
        AREA_CODES.put("충남", 34);
        AREA_CODES.put("경상북", 35);
        AREA_CODES.put("경북", 35);
        AREA_CODES.put("경상남", 36);
        AREA_CODES.put("경남", 36);
        AREA_CODES.put("전라북", 37);
        AREA_CODES.put("전북", 37);
        AREA_CODES.put("전라남", 38);
        AREA_CODES.put("전남", 38);
        AREA_CODES.put("제주", 39);

        ATTRACTION_VECTORS.put(12, new double[]{0.55, 0.25, 0.45, 0.35, 0.5}); // 관광지
        ATTRACTION_VECTORS.put(14, new double[]{0.30, 0.25, 0.30, 0.70, 0.5}); // 문화시설
        ATTRACTION_VECTORS.put(15, new double[]{0.80, 0.45, 0.70, 0.60, 0.55}); // 축제/공연/행사
        ATTRACTION_VECTORS.put(25, new double[]{0.50, 0.45, 0.50, 0.50, 0.5}); // 여행코스
        ATTRACTION_VECTORS.put(28, new double[]{0.90, 0.20, 0.70, 0.25, 0.5}); // 레포츠
        ATTRACTION_VECTORS.put(32, new double[]{0.30, 0.35, 0.25, 0.50, 0.5}); // 숙박
        ATTRACTION_VECTORS.put(38, new double[]{0.35, 0.35, 0.45, 0.85, 0.6}); // 쇼핑
        ATTRACTION_VECTORS.put(39, new double[]{0.30, 0.90, 0.45, 0.60, 0.5}); // 음식점
    }

    private final TourApiClient tourApiClient;
    private final RecommendationCacheRepository recommendationCacheRepository;
    private final TravelGroupRepository travelGroupRepository;
    private final GroupPersonaService groupPersonaService;
    private final CurrentUserResolver currentUserResolver;
    private final GroupAccessValidator groupAccessValidator;
    private final ObjectMapper objectMapper;

    public List<RecommendationResponse> recommend(Long groupId, Integer contentTypeId) {
        User user = currentUserResolver.getCurrentUser();
        groupAccessValidator.validateMember(groupId, user.getId());

        TravelGroup group = travelGroupRepository.findByIdAndDeletedAtIsNull(groupId)
                .orElseThrow(() -> new BusinessException(ErrorCode.GROUP_NOT_FOUND));
        int areaCode = resolveAreaCode(group.getDestination());

        List<TourSpot> spots = cachedSpots(areaCode, contentTypeId);
        PersonaVector persona = groupPersonaService.getGroupPersona(groupId).average();

        // 성향 정보가 없으면 TourAPI 기본 순서로 상위 N개를 그대로 반환한다.
        if (persona == null) {
            return spots.stream()
                    .limit(TOP_N)
                    .map(spot -> RecommendationResponse.of(spot, null))
                    .toList();
        }

        double[] personaVector = toArray(persona);
        return spots.stream()
                .map(spot -> {
                    int score = (int) Math.round(cosineSimilarity(personaVector, attractionVector(spot.contentTypeId())) * 100);
                    return RecommendationResponse.of(spot, score);
                })
                .sorted((a, b) -> Integer.compare(b.matchScore(), a.matchScore()))
                .limit(TOP_N)
                .toList();
    }

    // EI-03: (지역+카테고리) 24시간 캐시. 미스/만료 시에만 TourAPI를 호출한다.
    private List<TourSpot> cachedSpots(int areaCode, Integer contentTypeId) {
        String cacheKey = areaCode + "|" + (contentTypeId == null ? "ALL" : contentTypeId);
        LocalDateTime now = LocalDateTime.now();

        Optional<RecommendationCache> cached = recommendationCacheRepository.findByCacheKey(cacheKey);
        if (cached.isPresent() && !cached.get().isExpired(now)) {
            return deserialize(cached.get().getResultJson());
        }

        List<TourSpot> spots = tourApiClient.getAreaBasedList(areaCode, contentTypeId, FETCH_COUNT);
        String json = serialize(spots);
        LocalDateTime expiresAt = now.plusHours(CACHE_HOURS);
        cached.ifPresentOrElse(
                cache -> cache.refresh(json, expiresAt),
                () -> recommendationCacheRepository.save(RecommendationCache.builder()
                        .cacheKey(cacheKey).resultJson(json).expiresAt(expiresAt).build()));
        return spots;
    }

    // 그룹 destination(시/도 + 시/군/구)에서 시/도 키워드를 찾아 areaCode로 변환한다.
    // 시/군/구 이름이 다른 시/도명을 부분 포함할 수 있어(예: 부산 "해운대구"⊃"대구") 첫 토큰(시/도)만 매칭한다.
    private int resolveAreaCode(String destination) {
        if (destination != null && !destination.isBlank()) {
            String sido = destination.trim().split("\\s+")[0];
            for (Map.Entry<String, Integer> entry : AREA_CODES.entrySet()) {
                if (sido.contains(entry.getKey())) {
                    return entry.getValue();
                }
            }
        }
        throw new BusinessException(ErrorCode.INVALID_INPUT); // 지원하지 않는 지역
    }

    private double[] attractionVector(int contentTypeId) {
        return ATTRACTION_VECTORS.getOrDefault(contentTypeId, NEUTRAL_VECTOR);
    }

    private double[] toArray(PersonaVector persona) {
        return new double[]{persona.activity(), persona.food(), persona.pace(), persona.urbanNature(), persona.timePref()};
    }

    private double cosineSimilarity(double[] a, double[] b) {
        double dot = 0;
        double normA = 0;
        double normB = 0;
        for (int i = 0; i < a.length; i++) {
            dot += a[i] * b[i];
            normA += a[i] * a[i];
            normB += b[i] * b[i];
        }
        if (normA == 0 || normB == 0) {
            return 0;
        }
        return dot / (Math.sqrt(normA) * Math.sqrt(normB));
    }

    private String serialize(List<TourSpot> spots) {
        try {
            return objectMapper.writeValueAsString(spots);
        } catch (JsonProcessingException e) {
            throw new BusinessException(ErrorCode.INTERNAL_SERVER_ERROR);
        }
    }

    private List<TourSpot> deserialize(String json) {
        try {
            return objectMapper.readValue(json, new TypeReference<List<TourSpot>>() {});
        } catch (JsonProcessingException e) {
            throw new BusinessException(ErrorCode.INTERNAL_SERVER_ERROR);
        }
    }
}
