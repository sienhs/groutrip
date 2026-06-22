package com.enjoytrip.backend.domain.place.client;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

import com.enjoytrip.backend.global.exception.BusinessException;
import com.enjoytrip.backend.global.exception.ErrorCode;
import com.fasterxml.jackson.databind.JsonNode;

/**
 * EI-01: Google Maps Places API BE 프록시 클라이언트.
 * 모든 장소 검색의 단일 소스이며, API 키는 BE 환경 변수에서만 로드해 헤더로 전달한다(FE 노출 금지).
 * 응답 크기/과금 최소화를 위해 호출마다 필드 마스크를 명시한다(EI-01-C).
 *
 * <p>참고: 프로젝트가 MVC 스택이라 reactive WebClient 대신 동기 RestClient를 사용한다.
 */
@Component
public class GooglePlacesClient {

    private static final Logger log = LoggerFactory.getLogger(GooglePlacesClient.class);

    private static final String BASE_URL = "https://places.googleapis.com/v1";
    private static final String API_KEY_HEADER = "X-Goog-Api-Key";
    private static final String FIELD_MASK_HEADER = "X-Goog-FieldMask";
    private static final String LANGUAGE_CODE = "ko";
    private static final String REGION_CODE = "kr";
    private static final int SEARCH_PAGE_SIZE = 15; // FR-PLACE-01: 페이지당 15개

    // EI-01-A: Text Search 필드 마스크. Details는 호출하지 않으므로 검색용 기본 필드만 받는다.
    // nextPageToken을 받으려면 필드 마스크에 명시해야 한다(무한 스크롤용).
    private static final String SEARCH_FIELD_MASK = String.join(",",
            "places.id", "places.displayName", "places.formattedAddress", "places.location",
            "places.types", "places.rating", "places.userRatingCount", "places.priceLevel",
            "places.photos", "places.googleMapsUri", "nextPageToken");

    // FR-PLACE-02: 보관함 추가 시점에만 호출하는 Place Details 필드 마스크(상세 정보 포함).
    private static final String DETAILS_FIELD_MASK = String.join(",",
            "id", "displayName", "formattedAddress", "location", "types", "rating", "userRatingCount",
            "priceLevel", "photos", "googleMapsUri", "internationalPhoneNumber",
            "regularOpeningHours", "websiteUri");

    private final RestClient restClient;
    private final String apiKey;

    public GooglePlacesClient(@Value("${google.maps.api-key:}") String apiKey) {
        this.apiKey = apiKey;
        this.restClient = RestClient.builder().baseUrl(BASE_URL).build();
    }

    /**
     * EI-01-A: Text Search. includedType이 있으면 카테고리 필터로 사용한다.
     * pageToken을 넘기면 다음 페이지를 조회한다(없으면 첫 페이지). 검색 결과는 상세 필드 없이 반환된다.
     */
    public GooglePlacePage searchText(String query, String includedType, String pageToken) {
        requireApiKey();

        Map<String, Object> body = new LinkedHashMap<>();
        body.put("textQuery", query);
        body.put("languageCode", LANGUAGE_CODE);
        body.put("regionCode", REGION_CODE);
        body.put("pageSize", SEARCH_PAGE_SIZE);
        if (includedType != null) {
            body.put("includedType", includedType);
        }
        if (pageToken != null && !pageToken.isBlank()) {
            body.put("pageToken", pageToken);
        }

        try {
            JsonNode root = restClient.post()
                    .uri("/places:searchText")
                    .header(API_KEY_HEADER, apiKey)
                    .header(FIELD_MASK_HEADER, SEARCH_FIELD_MASK)
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(body)
                    .retrieve()
                    .body(JsonNode.class);

            List<GooglePlace> results = new ArrayList<>();
            if (root != null && root.has("places")) {
                for (JsonNode place : root.get("places")) {
                    results.add(parsePlace(place));
                }
            }
            String nextPageToken = (root != null && root.hasNonNull("nextPageToken"))
                    ? root.get("nextPageToken").asText()
                    : null;
            return new GooglePlacePage(results, nextPageToken);
        } catch (BusinessException e) {
            throw e;
        } catch (Exception e) {
            log.warn("Google Places Text Search failed: {}", e.getMessage());
            throw new BusinessException(ErrorCode.PLACE_SEARCH_FAILED);
        }
    }

    /**
     * EI-01-A: Place Details. 보관함 추가 시점에만 호출해 전화/영업시간 등을 보강한다.
     */
    public GooglePlace getDetails(String googlePlaceId) {
        requireApiKey();
        try {
            JsonNode root = restClient.get()
                    .uri("/places/{placeId}", googlePlaceId)
                    .header(API_KEY_HEADER, apiKey)
                    .header(FIELD_MASK_HEADER, DETAILS_FIELD_MASK)
                    .retrieve()
                    .body(JsonNode.class);

            if (root == null || !root.has("id")) {
                throw new BusinessException(ErrorCode.PLACE_NOT_FOUND);
            }
            return parsePlace(root);
        } catch (BusinessException e) {
            throw e;
        } catch (Exception e) {
            log.warn("Google Place Details failed: {}", e.getMessage());
            throw new BusinessException(ErrorCode.PLACE_SEARCH_FAILED);
        }
    }

    /**
     * EI-01-A: Place Photos 미디어 스트리밍. 키 노출을 막기 위해 BE에서만 호출한다.
     */
    public PhotoData fetchPhoto(String photoName, int maxWidthPx) {
        requireApiKey();
        try {
            // photoName(places/{id}/photos/{ref})의 슬래시가 경로 변수로 인코딩되지 않도록 리터럴 경로로 구성한다.
            String path = "/" + photoName + "/media?maxWidthPx=" + maxWidthPx;
            ResponseEntity<byte[]> response = restClient.get()
                    .uri(path)
                    .header(API_KEY_HEADER, apiKey)
                    .retrieve()
                    .toEntity(byte[].class);

            MediaType contentType = response.getHeaders().getContentType();
            return new PhotoData(
                    response.getBody(),
                    contentType != null ? contentType : MediaType.IMAGE_JPEG
            );
        } catch (Exception e) {
            log.warn("Google Place Photos failed: {}", e.getMessage());
            throw new BusinessException(ErrorCode.PLACE_SEARCH_FAILED);
        }
    }

    private void requireApiKey() {
        if (apiKey == null || apiKey.isBlank()) {
            log.warn("GOOGLE_MAPS_API_KEY is not configured");
            throw new BusinessException(ErrorCode.PLACE_SEARCH_FAILED);
        }
    }

    // Text Search와 Place Details의 공통 필드 구조를 하나의 파서로 처리한다.
    private GooglePlace parsePlace(JsonNode node) {
        List<String> types = new ArrayList<>();
        if (node.has("types")) {
            node.get("types").forEach(t -> types.add(t.asText()));
        }

        String photoName = null;
        if (node.has("photos") && node.get("photos").size() > 0) {
            photoName = text(node.get("photos").get(0), "name");
        }

        JsonNode location = node.path("location");
        String openingHours = null;
        JsonNode openingNode = node.path("regularOpeningHours").path("weekdayDescriptions");
        if (openingNode.isArray() && !openingNode.isEmpty()) {
            List<String> lines = new ArrayList<>();
            openingNode.forEach(line -> lines.add(line.asText()));
            openingHours = String.join("\n", lines);
        }

        return new GooglePlace(
                text(node, "id"),
                text(node.path("displayName"), "text"),
                text(node, "formattedAddress"),
                location.path("latitude").asDouble(0),
                location.path("longitude").asDouble(0),
                types,
                node.has("rating") ? node.get("rating").asDouble() : null,
                node.has("userRatingCount") ? node.get("userRatingCount").asInt() : null,
                text(node, "priceLevel"),
                photoName,
                text(node, "googleMapsUri"),
                text(node, "internationalPhoneNumber"),
                openingHours,
                text(node, "websiteUri")
        );
    }

    private String text(JsonNode node, String field) {
        JsonNode value = node.path(field);
        return value.isMissingNode() || value.isNull() ? null : value.asText();
    }

    public record PhotoData(byte[] data, MediaType contentType) {
    }
}
