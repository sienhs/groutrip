package com.enjoytrip.backend.domain.recommend.client;

import java.util.ArrayList;
import java.util.List;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

import com.enjoytrip.backend.global.exception.BusinessException;
import com.enjoytrip.backend.global.exception.ErrorCode;
import com.fasterxml.jackson.databind.JsonNode;

/**
 * EI-03: TourAPI(한국관광공사 국문 관광정보) BE 프록시 클라이언트. 추천 전용(검색 흐름과 분리).
 * 서비스 키는 BE 환경 변수에서만 로드한다. KorService2 areaBasedList2를 사용한다.
 */
@Component
public class TourApiClient {

    private static final Logger log = LoggerFactory.getLogger(TourApiClient.class);

    private static final String BASE_URL = "http://apis.data.go.kr/B551011/KorService2";
    private static final String MOBILE_APP = "enjoytrip";

    private final RestClient restClient;
    private final String serviceKey;

    public TourApiClient(@Value("${tourapi.service-key:}") String serviceKey) {
        this.serviceKey = serviceKey;
        this.restClient = RestClient.builder().baseUrl(BASE_URL).build();
    }

    /**
     * EI-03: 지역 기반 관광지 목록. contentTypeId가 null이면 전체 타입을 조회한다.
     */
    public List<TourSpot> getAreaBasedList(int areaCode, Integer contentTypeId, int numOfRows) {
        if (serviceKey == null || serviceKey.isBlank()) {
            log.warn("TOURAPI_SERVICE_KEY is not configured");
            throw new BusinessException(ErrorCode.PLACE_SEARCH_FAILED);
        }

        StringBuilder path = new StringBuilder("/areaBasedList2")
                .append("?serviceKey=").append(serviceKey)
                .append("&numOfRows=").append(numOfRows)
                .append("&pageNo=1&MobileOS=ETC&MobileApp=").append(MOBILE_APP)
                .append("&_type=json&arrange=O")  // arrange=O: 대표이미지 있는 항목 우선
                .append("&areaCode=").append(areaCode);
        if (contentTypeId != null) {
            path.append("&contentTypeId=").append(contentTypeId);
        }

        try {
            JsonNode root = restClient.get()
                    .uri(path.toString())
                    .retrieve()
                    .body(JsonNode.class);
            return parseItems(root);
        } catch (Exception e) {
            log.warn("TourAPI areaBasedList failed: {}", e.getMessage());
            throw new BusinessException(ErrorCode.PLACE_SEARCH_FAILED);
        }
    }

    private List<TourSpot> parseItems(JsonNode root) {
        List<TourSpot> spots = new ArrayList<>();
        if (root == null) {
            return spots;
        }
        JsonNode item = root.path("response").path("body").path("items").path("item");
        if (item.isArray()) {
            for (JsonNode node : item) {
                spots.add(toSpot(node));
            }
        } else if (item.isObject()) {
            // 결과가 1건이면 TourAPI는 배열이 아닌 단일 객체로 내려준다.
            spots.add(toSpot(item));
        }
        return spots;
    }

    private TourSpot toSpot(JsonNode node) {
        return new TourSpot(
                text(node, "contentid"),
                text(node, "title"),
                text(node, "addr1"),
                parseDouble(text(node, "mapy")),
                parseDouble(text(node, "mapx")),
                parseInt(text(node, "contenttypeid")),
                text(node, "firstimage")
        );
    }

    private String text(JsonNode node, String field) {
        JsonNode value = node.path(field);
        return value.isMissingNode() || value.isNull() ? null : value.asText();
    }

    private double parseDouble(String value) {
        try {
            return (value == null || value.isBlank()) ? 0 : Double.parseDouble(value);
        } catch (NumberFormatException e) {
            return 0;
        }
    }

    private int parseInt(String value) {
        try {
            return (value == null || value.isBlank()) ? 0 : Integer.parseInt(value);
        } catch (NumberFormatException e) {
            return 0;
        }
    }
}
