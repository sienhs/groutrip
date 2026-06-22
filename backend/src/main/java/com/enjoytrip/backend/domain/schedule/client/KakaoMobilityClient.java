package com.enjoytrip.backend.domain.schedule.client;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

import com.enjoytrip.backend.global.exception.BusinessException;
import com.enjoytrip.backend.global.exception.ErrorCode;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

/**
 * EI-02: 카카오 모빌리티 BE 프록시 클라이언트. 이동 시간·비용 계산 전용(장소 검색에는 사용하지 않는다).
 * 일반 개발자 키로는 자동차 길찾기만 공개되므로 대중교통은 별도 제공자(ODsay 등)로 대체 예정이다.
 * 키는 BE 환경 변수에서만 로드한다(FE 노출 금지).
 */
@Component
public class KakaoMobilityClient {

    private static final Logger log = LoggerFactory.getLogger(KakaoMobilityClient.class);

    private static final String BASE_URL = "https://apis-navi.kakaomobility.com";

    private final RestClient restClient;
    private final String apiKey;
    // Boot 4 RestClient(Jackson 3)에서 Jackson 2 JsonNode 역직렬화 불가 → String으로 받아 직접 파싱.
    private final ObjectMapper objectMapper = new ObjectMapper();

    public KakaoMobilityClient(@Value("${kakao.mobility.api-key:}") String apiKey) {
        this.apiKey = apiKey;
        this.restClient = RestClient.builder().baseUrl(BASE_URL).build();
    }

    /**
     * EI-02-A: 자동차 길찾기. 좌표는 (경도,위도) 순서로 전달한다.
     */
    public KakaoDirections getCarDirections(double originLng, double originLat,
                                            double destLng, double destLat) {
        if (apiKey == null || apiKey.isBlank()) {
            log.warn("KAKAO_MOBILITY_API_KEY is not configured");
            throw new BusinessException(ErrorCode.DIRECTIONS_FETCH_FAILED);
        }

        String path = "/v1/directions?origin=" + originLng + "," + originLat
                + "&destination=" + destLng + "," + destLat
                + "&priority=RECOMMEND";

        try {
            String response = restClient.get()
                    .uri(path)
                    .header("Authorization", "KakaoAK " + apiKey)
                    .retrieve()
                    .body(String.class);
            JsonNode root = (response == null || response.isBlank()) ? null : objectMapper.readTree(response);

            JsonNode route = (root != null && root.has("routes") && root.get("routes").size() > 0)
                    ? root.get("routes").get(0)
                    : null;
            // result_code 0이 성공. 그 외(경로 없음 등)는 길찾기 실패로 처리한다.
            if (route == null || route.path("result_code").asInt(-1) != 0) {
                throw new BusinessException(ErrorCode.DIRECTIONS_FETCH_FAILED);
            }

            JsonNode summary = route.path("summary");
            JsonNode fare = summary.path("fare");
            return new KakaoDirections(
                    summary.path("distance").asInt(0),
                    summary.path("duration").asInt(0),
                    fare.path("toll").asInt(0),
                    fare.path("taxi").asInt(0)
            );
        } catch (BusinessException e) {
            throw e;
        } catch (Exception e) {
            log.warn("Kakao Mobility car directions failed: {}", e.getMessage());
            throw new BusinessException(ErrorCode.DIRECTIONS_FETCH_FAILED);
        }
    }
}
