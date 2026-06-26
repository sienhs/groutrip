package com.enjoytrip.backend.domain.place.client;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

import com.enjoytrip.backend.domain.place.dto.PlaceSearchResult;
import com.enjoytrip.backend.domain.place.entity.PlaceCategory;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

/**
 * 카카오 로컬 API 클라이언트(키워드/주소 검색).
 * Google Places에 없는 국내 장소를 보완하고, 직접입력 주소의 좌표(위경도)를 확보한다.
 * 인증: 헤더 {@code Authorization: KakaoAK {REST API KEY}}.
 *
 * <p>Boot 4 RestClient는 Jackson 3 컨버터라, GooglePlacesClient와 동일하게
 * 응답을 String으로 받아 Jackson 2 ObjectMapper로 파싱한다.
 */
@Component
public class KakaoLocalClient {

    private static final Logger log = LoggerFactory.getLogger(KakaoLocalClient.class);
    private static final String BASE_URL = "https://dapi.kakao.com";
    private static final int SIZE = 15;

    private final RestClient restClient;
    private final String apiKey;
    private final ObjectMapper objectMapper = new ObjectMapper();

    public KakaoLocalClient(@Value("${kakao.local.api-key:}") String apiKey) {
        this.apiKey = apiKey;
        this.restClient = RestClient.builder().baseUrl(BASE_URL).build();
    }

    public boolean isEnabled() {
        return apiKey != null && !apiKey.isBlank();
    }

    /**
     * 키워드로 국내 장소 검색. 결과는 {@code googlePlaceId="kakao:{id}"} 형태로 채워 반환한다.
     * 키 미설정/오류 시 빈 목록(검색 흐름을 깨지 않음).
     */
    public List<PlaceSearchResult> searchKeyword(String query) {
        if (!isEnabled() || query == null || query.isBlank()) {
            return List.of();
        }
        try {
            String response = restClient.get()
                    .uri("/v2/local/search/keyword.json?query={q}&size={size}", query, SIZE)
                    .header("Authorization", "KakaoAK " + apiKey)
                    .retrieve()
                    .body(String.class);
            JsonNode root = (response == null || response.isBlank()) ? null : objectMapper.readTree(response);
            List<PlaceSearchResult> results = new ArrayList<>();
            if (root != null && root.has("documents")) {
                for (JsonNode d : root.get("documents")) {
                    String id = text(d, "id");
                    String name = text(d, "place_name");
                    if (id == null || name == null) {
                        continue;
                    }
                    String road = text(d, "road_address_name");
                    String address = (road != null && !road.isBlank()) ? road : text(d, "address_name");
                    String categoryName = text(d, "category_name");
                    results.add(new PlaceSearchResult(
                            "kakao:" + id,
                            name,
                            mapCategory(text(d, "category_group_code")).name(),
                            address,
                            parseDouble(text(d, "y")),  // 위도(lat)
                            parseDouble(text(d, "x")),  // 경도(lng)
                            categoryName == null ? List.of() : List.of(categoryName),
                            null, null, null, null,     // rating/ratingCount/priceLevel/photoUrl 없음
                            text(d, "place_url")
                    ));
                }
            }
            return results;
        } catch (Exception e) {
            log.warn("Kakao 로컬 키워드 검색 실패 '{}': {}", query, e.getMessage());
            return List.of();
        }
    }

    /** 주소 → 좌표[lat, lng]. 직접입력 장소의 좌표 확보용. 실패 시 empty. */
    public Optional<double[]> geocodeAddress(String address) {
        if (!isEnabled() || address == null || address.isBlank()) {
            return Optional.empty();
        }
        try {
            String response = restClient.get()
                    .uri("/v2/local/search/address.json?query={q}&size=1", address)
                    .header("Authorization", "KakaoAK " + apiKey)
                    .retrieve()
                    .body(String.class);
            JsonNode root = (response == null || response.isBlank()) ? null : objectMapper.readTree(response);
            if (root != null && root.has("documents") && root.get("documents").size() > 0) {
                JsonNode d = root.get("documents").get(0);
                return Optional.of(new double[]{ parseDouble(text(d, "y")), parseDouble(text(d, "x")) });
            }
        } catch (Exception e) {
            log.warn("Kakao 주소 지오코딩 실패 '{}': {}", address, e.getMessage());
        }
        return Optional.empty();
    }

    // 카카오 카테고리 그룹 코드 → 우리 PlaceCategory.
    private PlaceCategory mapCategory(String code) {
        if (code == null) {
            return PlaceCategory.ETC;
        }
        return switch (code) {
            case "FD6" -> PlaceCategory.RESTAURANT;     // 음식점
            case "CE7" -> PlaceCategory.CAFE;           // 카페
            case "AD5" -> PlaceCategory.LODGING;        // 숙박
            case "AT4" -> PlaceCategory.TOURIST_ATTRACTION; // 관광명소
            case "MT1" -> PlaceCategory.SHOPPING;       // 대형마트
            default -> PlaceCategory.ETC;
        };
    }

    private String text(JsonNode node, String field) {
        JsonNode v = node.path(field);
        return v.isMissingNode() || v.isNull() ? null : v.asText();
    }

    private double parseDouble(String s) {
        try {
            return s == null ? 0 : Double.parseDouble(s);
        } catch (NumberFormatException e) {
            return 0;
        }
    }
}
