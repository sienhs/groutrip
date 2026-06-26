package com.enjoytrip.backend.domain.recommend.service;

import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.enjoytrip.backend.domain.auth.entity.User;
import com.enjoytrip.backend.domain.place.client.GooglePlace;
import com.enjoytrip.backend.domain.place.client.GooglePlacePage;
import com.enjoytrip.backend.domain.place.client.GooglePlacesClient;
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
import lombok.extern.slf4j.Slf4j;

/**
 * FR-RECOMMEND-01/02 (SHOULD): TourAPI 지역 기반 추천을 그룹 평균 성향과의 코사인 유사도로 정렬한다.
 * (지역 + 카테고리) 결과는 24시간 캐시한다.
 */
@Slf4j
@Service
@RequiredArgsConstructor
@Transactional
public class RecommendService {

    private static final int FETCH_COUNT = 50;   // 정렬 풀
    private static final int TOP_N = 20;          // 상위 20개 표시
    private static final int CACHE_HOURS = 24;

    // 시/도 키워드 → TourAPI areaCode. 그룹 destination 문자열에 포함되는지로 매칭한다.
    private static final Map<String, Integer> AREA_CODES = new LinkedHashMap<>();

    // 시/도 접두어 없이 시/군 이름만 저장된 destination(예: "용인시")을 areaCode로 매칭하기 위한 보조 맵.
    private static final Map<String, Integer> CITY_CODES = new LinkedHashMap<>();

    // 시/군/구가 아닌 인기 지명(섬·해변·관광지 등) → 소속 광역시·도 areaCode.
    // 프론트 lib/regions.ts 의 LANDMARKS 와 짝을 이룬다(지명 추가 시 양쪽에 추가).
    private static final Map<String, Integer> LANDMARK_CODES = new LinkedHashMap<>();

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

        // 시/도 접두어 없이 자주 입력되는 주요 시/군 → 소속 광역시·도 areaCode.
        // 시/도 매칭 실패 시에만 보조로 사용한다(광역시명과 겹치는 "광주시"[경기]는 광역시 우선이라 제외).
        CITY_CODES.put("수원", 31); CITY_CODES.put("용인", 31); CITY_CODES.put("성남", 31);
        CITY_CODES.put("고양", 31); CITY_CODES.put("부천", 31); CITY_CODES.put("안양", 31);
        CITY_CODES.put("안산", 31); CITY_CODES.put("화성", 31); CITY_CODES.put("평택", 31);
        CITY_CODES.put("의정부", 31); CITY_CODES.put("파주", 31); CITY_CODES.put("김포", 31);
        CITY_CODES.put("광명", 31); CITY_CODES.put("가평", 31); CITY_CODES.put("양평", 31);
        CITY_CODES.put("포천", 31); CITY_CODES.put("여주", 31); CITY_CODES.put("이천", 31);
        CITY_CODES.put("남양주", 31);
        CITY_CODES.put("춘천", 32); CITY_CODES.put("원주", 32); CITY_CODES.put("강릉", 32);
        CITY_CODES.put("속초", 32); CITY_CODES.put("동해", 32); CITY_CODES.put("삼척", 32);
        CITY_CODES.put("태백", 32); CITY_CODES.put("정선", 32); CITY_CODES.put("평창", 32);
        CITY_CODES.put("홍천", 32); CITY_CODES.put("양양", 32); CITY_CODES.put("인제", 32);
        CITY_CODES.put("청주", 33); CITY_CODES.put("충주", 33); CITY_CODES.put("제천", 33);
        CITY_CODES.put("단양", 33); CITY_CODES.put("보은", 33);
        CITY_CODES.put("천안", 34); CITY_CODES.put("아산", 34); CITY_CODES.put("공주", 34);
        CITY_CODES.put("보령", 34); CITY_CODES.put("서산", 34); CITY_CODES.put("논산", 34);
        CITY_CODES.put("당진", 34); CITY_CODES.put("태안", 34); CITY_CODES.put("부여", 34);
        CITY_CODES.put("예산", 34);
        CITY_CODES.put("포항", 35); CITY_CODES.put("경주", 35); CITY_CODES.put("안동", 35);
        CITY_CODES.put("구미", 35); CITY_CODES.put("영주", 35); CITY_CODES.put("문경", 35);
        CITY_CODES.put("상주", 35); CITY_CODES.put("김천", 35); CITY_CODES.put("영천", 35);
        CITY_CODES.put("울릉", 35);
        CITY_CODES.put("창원", 36); CITY_CODES.put("진주", 36); CITY_CODES.put("통영", 36);
        CITY_CODES.put("김해", 36); CITY_CODES.put("거제", 36); CITY_CODES.put("양산", 36);
        CITY_CODES.put("사천", 36); CITY_CODES.put("밀양", 36); CITY_CODES.put("남해", 36);
        CITY_CODES.put("거창", 36); CITY_CODES.put("합천", 36); CITY_CODES.put("하동", 36);
        CITY_CODES.put("전주", 37); CITY_CODES.put("군산", 37); CITY_CODES.put("익산", 37);
        CITY_CODES.put("정읍", 37); CITY_CODES.put("남원", 37); CITY_CODES.put("김제", 37);
        CITY_CODES.put("무주", 37); CITY_CODES.put("부안", 37); CITY_CODES.put("고창", 37);
        CITY_CODES.put("여수", 38); CITY_CODES.put("순천", 38); CITY_CODES.put("목포", 38);
        CITY_CODES.put("광양", 38); CITY_CODES.put("나주", 38); CITY_CODES.put("담양", 38);
        CITY_CODES.put("보성", 38); CITY_CODES.put("해남", 38); CITY_CODES.put("완도", 38);
        CITY_CODES.put("진도", 38); CITY_CODES.put("곡성", 38);
        CITY_CODES.put("서귀포", 39);

        // 인기 지명 → 소속 광역시·도 areaCode (시/도·시/군 매칭 실패 시 보조).
        LANDMARK_CODES.put("대부도", 31); LANDMARK_CODES.put("오이도", 31);
        LANDMARK_CODES.put("남이섬", 31);
        LANDMARK_CODES.put("을왕리", 2); LANDMARK_CODES.put("영종도", 2); LANDMARK_CODES.put("강화도", 2);
        LANDMARK_CODES.put("경포대", 32);
        LANDMARK_CODES.put("해운대", 6); LANDMARK_CODES.put("광안리", 6);
        LANDMARK_CODES.put("협재", 39);
        LANDMARK_CODES.put("명동", 1); LANDMARK_CODES.put("홍대", 1); LANDMARK_CODES.put("강남", 1);

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
    private final GooglePlacesClient googlePlacesClient;
    // 정적 매핑이 안 되는 임의 지명의 지오코딩 결과(지명 → areaCode)를 메모리에 캐시해 반복 호출을 막는다.
    private final Map<String, Integer> geocodeAreaCache = new ConcurrentHashMap<>();
    // 내부 캐시 JSON 직렬화 전용. Spring Boot 4는 Jackson 3 ObjectMapper 빈만 제공하므로 직접 생성한다.
    private final ObjectMapper objectMapper = new ObjectMapper();

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
                    .map(spot -> RecommendationResponse.of(spot, null, reason(spot, null, null)))
                    .toList();
        }

        double[] personaVector = toArray(persona);
        return spots.stream()
                .map(spot -> {
                    int score = (int) Math.round(cosineSimilarity(personaVector, attractionVector(spot.contentTypeId())) * 100);
                    return RecommendationResponse.of(spot, score, reason(spot, persona, score));
                })
                .sorted((a, b) -> Integer.compare(b.matchScore(), a.matchScore()))
                .limit(TOP_N)
                .toList();
    }

    // 추천 이유: 카테고리명을 명시하고(숙박/음식점 등), 성향이 있으면 그룹의 가장 두드러진 취향을 곁들인다.
    // 그룹마다 평균 성향이 달라 수식어가 달라지므로 "모든 그룹이 똑같다"는 인상도 줄어든다.
    private String reason(TourSpot spot, PersonaVector persona, Integer score) {
        String label = RecommendationResponse.categoryLabelOf(spot.contentTypeId());
        if (persona == null) {
            return "이 지역에서 인기 있는 " + label + "예요.";
        }
        return personaTrait(persona) + " 그룹에 어울리는 " + label + "예요 (성향 일치 " + score + "%).";
    }

    // 평균 성향에서 중앙(0.5)으로부터 가장 멀리 벗어난 축 = 그룹의 가장 뚜렷한 취향을 한 줄 수식어로.
    private String personaTrait(PersonaVector p) {
        double dActivity = Math.abs(p.activity() - 0.5);
        double dFood = Math.abs(p.food() - 0.5);
        double dUrban = Math.abs(p.urbanNature() - 0.5);
        if (dFood >= dActivity && dFood >= dUrban) {
            return p.food() >= 0.5 ? "먹거리를 즐기는" : "관광에 집중하는";
        }
        if (dActivity >= dUrban) {
            return p.activity() >= 0.5 ? "활동적인" : "여유롭게 쉬는";
        }
        return p.urbanNature() >= 0.5 ? "도심 나들이를 즐기는" : "자연을 즐기는";
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

    // 그룹 destination(시/도 + 시/군/구)에서 지역 키워드를 찾아 areaCode로 변환한다.
    // 시/군/구 이름이 다른 시/도명을 부분 포함할 수 있어(예: 부산 "해운대구"⊃"대구") 첫 토큰(시/도)만 매칭한다.
    // 시/도 접두어가 없는 경우(예: "용인시")는 보조 시/군 맵으로 다시 매칭한다.
    private int resolveAreaCode(String destination) {
        if (destination != null && !destination.isBlank()) {
            // 시/군/구 이름이 다른 시/도명을 부분 포함할 수 있어(예: 부산 "해운대구"⊃"대구") 첫 토큰(시/도)만 매칭한다.
            Integer staticCode = matchAreaCode(destination.trim().split("\\s+")[0]);
            if (staticCode != null) {
                return staticCode;
            }
            // 정적 매핑 실패 → 지오코딩 폴백: 임의 지명도 소속 시/도로 해석해 추천이 동작하게 한다.
            Integer geocoded = resolveAreaCodeByGeocoding(destination.trim());
            if (geocoded != null) {
                return geocoded;
            }
        }
        throw new BusinessException(ErrorCode.INVALID_INPUT); // 지원하지 않는 지역
    }

    /**
     * 주어진 텍스트에 시/도 → 시/군 → 인기 지명 키가 포함되면 그 areaCode를 우선순위 순으로 반환한다(없으면 null).
     * 그룹 destination 토큰뿐 아니라 지오코딩 결과 주소(예: "안산시 대부도")에도 동일하게 적용한다.
     */
    private Integer matchAreaCode(String text) {
        for (Map.Entry<String, Integer> entry : AREA_CODES.entrySet()) {
            if (text.contains(entry.getKey())) {
                return entry.getValue();
            }
        }
        for (Map.Entry<String, Integer> entry : CITY_CODES.entrySet()) {
            if (text.contains(entry.getKey())) {
                return entry.getValue();
            }
        }
        for (Map.Entry<String, Integer> entry : LANDMARK_CODES.entrySet()) {
            if (text.contains(entry.getKey())) {
                return entry.getValue();
            }
        }
        return null;
    }

    /**
     * 정적 매핑(시/도·시/군·인기 지명)이 실패한 임의 지명을 Google 텍스트 검색으로 해석한다.
     * 결과 주소 문자열에서 시/도명을 찾아 areaCode로 변환하고, 같은 지명은 메모리에 캐시한다.
     * 검색 실패/키 미설정/해석 불가 시 null 을 돌려준다(호출부가 INVALID_INPUT 처리).
     */
    private Integer resolveAreaCodeByGeocoding(String destination) {
        Integer cached = geocodeAreaCache.get(destination);
        if (cached != null) {
            return cached;
        }
        try {
            GooglePlacePage page = googlePlacesClient.searchText(destination, null, null);
            for (GooglePlace place : page.places()) {
                String address = place.address();
                if (address == null || address.isBlank()) {
                    continue;
                }
                // 주소에 시/도가 없고 시/군만 있는 경우(예: "안산시 대부도")도 매칭되도록 시/군·지명까지 스캔한다.
                Integer code = matchAreaCode(address);
                if (code != null) {
                    geocodeAreaCache.put(destination, code);
                    return code;
                }
            }
        } catch (Exception e) {
            log.warn("목적지 지오코딩 폴백 실패 '{}': {}", destination, e.getMessage());
        }
        return null;
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
