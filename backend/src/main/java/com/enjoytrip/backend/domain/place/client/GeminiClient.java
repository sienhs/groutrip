package com.enjoytrip.backend.domain.place.client;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

import com.enjoytrip.backend.global.exception.BusinessException;
import com.enjoytrip.backend.global.exception.ErrorCode;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

/**
 * Google Gemini(Generative Language API) 클라이언트 — 리뷰 요약 등 가벼운 텍스트 생성용.
 * 무료 티어가 있고 빠른 Flash 모델을 기본값으로 쓴다. 키는 BE 환경 변수에서만 로드한다.
 * 키 미설정 시 isConfigured()=false → 호출부가 기능을 우아하게 비활성화한다.
 */
@Component
public class GeminiClient {

    private static final Logger log = LoggerFactory.getLogger(GeminiClient.class);

    private static final String BASE_URL = "https://generativelanguage.googleapis.com/v1beta";

    private final RestClient restClient;
    private final String apiKey;
    private final String model;
    private final ObjectMapper objectMapper = new ObjectMapper();

    public GeminiClient(
            @Value("${gemini.api-key:}") String apiKey,
            @Value("${gemini.model:gemini-2.5-flash}") String model) {
        this.apiKey = apiKey;
        this.model = model;
        this.restClient = RestClient.builder().baseUrl(BASE_URL).build();
    }

    public boolean isConfigured() {
        return apiKey != null && !apiKey.isBlank();
    }

    /**
     * 프롬프트를 보내고 생성된 텍스트를 반환한다. maxOutputTokens로 응답 길이를 제한해 비용/지연을 통제한다.
     */
    public String generate(String prompt, int maxOutputTokens) {
        return call(prompt, baseConfig(maxOutputTokens));
    }

    /**
     * JSON 모드 생성 — responseSchema에 맞춘 JSON 문자열을 반환한다(마크다운 없이 구조화 출력).
     * 호출부는 반환된 JSON을 파싱해 화면을 직접 스타일링한다.
     */
    public String generateJson(String prompt, int maxOutputTokens, Map<String, Object> responseSchema) {
        Map<String, Object> config = baseConfig(maxOutputTokens);
        config.put("responseMimeType", "application/json");
        config.put("responseSchema", responseSchema);
        return call(prompt, config);
    }

    // 공통 generationConfig. Gemini 2.5 flash는 기본 'thinking' 모델 → 추론에 출력 토큰을 소모해 답이 잘린다.
    // 요약엔 추론이 불필요하므로 thinkingBudget=0으로 꺼서 속도·토큰을 아끼고 답을 온전히 받는다.
    private Map<String, Object> baseConfig(int maxOutputTokens) {
        Map<String, Object> config = new LinkedHashMap<>();
        config.put("temperature", 0.3);
        config.put("maxOutputTokens", maxOutputTokens);
        config.put("thinkingConfig", Map.of("thinkingBudget", 0));
        return config;
    }

    private String call(String prompt, Map<String, Object> generationConfig) {
        if (!isConfigured()) {
            throw new BusinessException(ErrorCode.REVIEW_SUMMARY_FAILED);
        }
        Map<String, Object> body = Map.of(
                "contents", List.of(Map.of("parts", List.of(Map.of("text", prompt)))),
                "generationConfig", generationConfig
        );
        try {
            String response = restClient.post()
                    .uri("/models/{model}:generateContent?key={key}", model, apiKey)
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(body)
                    .retrieve()
                    .body(String.class);
            JsonNode root = (response == null || response.isBlank()) ? null : objectMapper.readTree(response);
            if (root == null) {
                throw new BusinessException(ErrorCode.REVIEW_SUMMARY_FAILED);
            }
            JsonNode parts = root.path("candidates").path(0).path("content").path("parts");
            StringBuilder sb = new StringBuilder();
            for (JsonNode part : parts) {
                String t = part.path("text").asText("");
                if (!t.isBlank()) {
                    sb.append(t);
                }
            }
            String text = sb.toString().trim();
            if (text.isEmpty()) {
                throw new BusinessException(ErrorCode.REVIEW_SUMMARY_FAILED);
            }
            return text;
        } catch (BusinessException e) {
            throw e;
        } catch (Exception e) {
            log.warn("Gemini generate failed: {}", e.getMessage());
            throw new BusinessException(ErrorCode.REVIEW_SUMMARY_FAILED);
        }
    }
}
