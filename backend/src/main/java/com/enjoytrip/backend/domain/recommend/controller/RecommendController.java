package com.enjoytrip.backend.domain.recommend.controller;

import java.util.List;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.enjoytrip.backend.domain.group.aop.RequiredGroupMember;
import com.enjoytrip.backend.domain.recommend.dto.RecommendationResponse;
import com.enjoytrip.backend.domain.recommend.service.RecommendService;
import com.enjoytrip.backend.global.response.ApiResponse;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;

/**
 * FR-RECOMMEND (SHOULD): 그룹 목적지 + 성향 기반 관광지 추천.
 */
@RestController
@RequestMapping("/api/groups/{groupId}/recommendations")
@RequiredArgsConstructor
@Tag(name = "Recommend", description = "성향 기반 관광지 추천 API (TourAPI)")
public class RecommendController {

    private final RecommendService recommendService;

    @RequiredGroupMember
    @GetMapping
    @Operation(
            summary = "관광지 추천",
            description = """
                    FR-RECOMMEND-01/02: 그룹 목적지 지역의 TourAPI 관광지를 그룹 평균 성향과의 코사인 유사도로 정렬해
                    상위 20개를 반환한다. (지역+카테고리) 결과는 24시간 캐시된다.
                    contentTypeId(12=관광지,14=문화시설,15=행사,25=여행코스,28=레포츠,32=숙박,38=쇼핑,39=음식점)는 선택이다.
                    """
    )
    public ResponseEntity<ApiResponse<List<RecommendationResponse>>> recommend(
            @Parameter(description = "그룹 ID", example = "1")
            @PathVariable Long groupId,
            @Parameter(description = "관광 타입 필터(미지정 시 전체)", example = "12")
            @RequestParam(required = false) Integer contentTypeId
    ) {
        List<RecommendationResponse> response = recommendService.recommend(groupId, contentTypeId);
        return ResponseEntity.ok(ApiResponse.success("추천 조회 성공", response));
    }
}
