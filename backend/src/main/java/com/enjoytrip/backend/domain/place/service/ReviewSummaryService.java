package com.enjoytrip.backend.domain.place.service;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

import org.springframework.stereotype.Service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

import com.enjoytrip.backend.domain.auth.entity.User;
import com.enjoytrip.backend.domain.group.service.CurrentUserResolver;
import com.enjoytrip.backend.domain.group.service.GroupAccessValidator;
import com.enjoytrip.backend.domain.place.client.GeminiClient;
import com.enjoytrip.backend.domain.place.client.GooglePlacesClient;
import com.enjoytrip.backend.domain.place.client.GoogleReviews;
import com.enjoytrip.backend.domain.place.dto.ReviewSummaryResponse;

import lombok.RequiredArgsConstructor;

/**
 * 장소/숙소의 구글 리뷰를 AI(Gemini)로 요약한다.
 *  - 토큰 절약: '리뷰 보기' 클릭 시점에만 호출(지연 실행)하고, 결과를 googlePlaceId 기준 인메모리 캐시(7일).
 *  - 리뷰가 없거나 AI 키 미설정이면 available=false로 우아하게 안내한다(요청 실패로 처리하지 않음).
 */
@Service
@RequiredArgsConstructor
public class ReviewSummaryService {

    private static final Duration CACHE_TTL = Duration.ofDays(7);
    private static final int MAX_REVIEWS = 5;       // 구글 제공 한도
    private static final int MAX_OUTPUT_TOKENS = 600; // thinking 비활성 + 한국어 + JSON 구조 고려

    // Gemini JSON 모드 스키마: 총평 + 장점/아쉬운 점 목록(마크다운 없이 구조화).
    private static final Map<String, Object> SCHEMA = Map.of(
            "type", "OBJECT",
            "properties", Map.of(
                    "overall", Map.of("type", "STRING"),
                    "pros", Map.of("type", "ARRAY", "items", Map.of("type", "STRING")),
                    "cons", Map.of("type", "ARRAY", "items", Map.of("type", "STRING"))),
            "required", List.of("overall", "pros", "cons"));

    private final GooglePlacesClient googlePlacesClient;
    private final GeminiClient geminiClient;
    private final CurrentUserResolver currentUserResolver;
    private final GroupAccessValidator groupAccessValidator;
    private final ObjectMapper objectMapper = new ObjectMapper();

    // googlePlaceId → 캐시된 요약(생성시각 포함). 동일 장소 재클릭 시 AI 재호출을 막아 토큰을 아낀다.
    private final Map<String, Cached> cache = new ConcurrentHashMap<>();

    public ReviewSummaryResponse summarize(Long groupId, String googlePlaceId) {
        User user = currentUserResolver.getCurrentUser();
        groupAccessValidator.validateMember(groupId, user.getId());

        Cached hit = cache.get(googlePlaceId);
        if (hit != null && !hit.isExpired()) {
            return hit.response();
        }

        if (!geminiClient.isConfigured()) {
            return ReviewSummaryResponse.unavailable(
                    "AI 요약이 아직 설정되지 않았어요. 잠시 후 다시 시도해 주세요.", null, null);
        }

        GoogleReviews reviews = googlePlacesClient.getReviews(googlePlaceId);
        if (reviews.reviews().isEmpty()) {
            return ReviewSummaryResponse.unavailable(
                    "요약할 리뷰가 충분하지 않아요.", reviews.rating(), reviews.ratingCount());
        }

        String json = geminiClient.generateJson(buildPrompt(reviews), MAX_OUTPUT_TOKENS, SCHEMA);
        ReviewSummaryResponse response = parse(json, reviews);

        cache.put(googlePlaceId, new Cached(response, LocalDateTime.now().plus(CACHE_TTL)));
        return response;
    }

    // Gemini JSON 응답 파싱 → 구조화 응답. 파싱 실패 시 요약 실패로 안내한다.
    private ReviewSummaryResponse parse(String json, GoogleReviews reviews) {
        try {
            JsonNode node = objectMapper.readTree(json);
            String overall = node.path("overall").asText("").trim();
            List<String> pros = toList(node.path("pros"));
            List<String> cons = toList(node.path("cons"));
            if (overall.isEmpty() && pros.isEmpty() && cons.isEmpty()) {
                return ReviewSummaryResponse.unavailable(
                        "리뷰 요약을 만들지 못했어요.", reviews.rating(), reviews.ratingCount());
            }
            return ReviewSummaryResponse.of(reviews.rating(), reviews.ratingCount(),
                    Math.min(reviews.reviews().size(), MAX_REVIEWS), overall, pros, cons);
        } catch (Exception e) {
            return ReviewSummaryResponse.unavailable(
                    "리뷰 요약을 만들지 못했어요.", reviews.rating(), reviews.ratingCount());
        }
    }

    private List<String> toList(JsonNode arr) {
        List<String> out = new ArrayList<>();
        if (arr.isArray()) {
            for (JsonNode item : arr) {
                String s = item.asText("").trim();
                if (!s.isEmpty()) {
                    out.add(s);
                }
            }
        }
        return out;
    }

    private String buildPrompt(GoogleReviews reviews) {
        StringBuilder sb = new StringBuilder();
        sb.append("아래는 한 장소의 구글 방문자 리뷰입니다. 여행 계획에 참고할 수 있게 한국어로 요약해 JSON으로만 답하세요.\n");
        sb.append("overall: 한 줄 총평(한 문장). pros: 장점 2~3개(각 항목 짧은 구). cons: 아쉬운 점 1~2개(각 항목 짧은 구).\n");
        sb.append("이모지/마크다운 기호 없이 자연스러운 한국어 구로만 작성하고, 과장 없이 리뷰 근거로만 작성하세요.\n\n");
        if (reviews.rating() != null) {
            sb.append("평균 별점: ").append(reviews.rating());
            if (reviews.ratingCount() != null) {
                sb.append(" (리뷰 ").append(reviews.ratingCount()).append("개)");
            }
            sb.append('\n');
        }
        sb.append("리뷰:\n");
        int i = 1;
        for (GoogleReviews.Review r : reviews.reviews()) {
            sb.append(i++).append(". ");
            if (r.rating() != null) {
                sb.append('[').append(r.rating()).append("점] ");
            }
            sb.append(r.text().replaceAll("\\s+", " ").trim()).append('\n');
        }
        return sb.toString();
    }

    private record Cached(ReviewSummaryResponse response, LocalDateTime expiresAt) {
        boolean isExpired() {
            return LocalDateTime.now().isAfter(expiresAt);
        }
    }
}
