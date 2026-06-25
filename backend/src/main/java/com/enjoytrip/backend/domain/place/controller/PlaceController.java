package com.enjoytrip.backend.domain.place.controller;

import java.util.List;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.enjoytrip.backend.domain.group.aop.RequiredGroupMember;
import com.enjoytrip.backend.domain.place.dto.BookmarkCreateRequest;
import com.enjoytrip.backend.domain.place.dto.BookmarkResponse;
import com.enjoytrip.backend.domain.place.dto.BookmarkSort;
import com.enjoytrip.backend.domain.place.dto.BookmarkUpdateRequest;
import com.enjoytrip.backend.domain.place.dto.PlaceSearchPage;
import com.enjoytrip.backend.domain.place.dto.PlaceSearchResult;
import com.enjoytrip.backend.domain.place.dto.ReviewSummaryResponse;
import com.enjoytrip.backend.domain.place.entity.PlaceCategory;
import com.enjoytrip.backend.domain.place.service.PlaceService;
import com.enjoytrip.backend.domain.place.service.ReviewSummaryService;
import com.enjoytrip.backend.global.response.ApiResponse;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

/**
 * FR-PLACE-01 ~ 04: 그룹 장소 검색 및 보관함 CRUD.
 * 모든 진입점은 그룹 멤버 권한이 필요하다(@RequiredGroupMember).
 */
@RestController
@RequestMapping("/api/groups/{groupId}/places")
@RequiredArgsConstructor
@Tag(name = "Place", description = "그룹 장소 검색 및 보관함 API")
public class PlaceController {

    // 무한 스크롤용 다음 페이지 토큰 헤더. CORS 노출 헤더에 등록되어 있어야 FE에서 읽을 수 있다.
    private static final String NEXT_PAGE_TOKEN_HEADER = "X-Next-Page-Token";

    private final PlaceService placeService;
    private final ReviewSummaryService reviewSummaryService;

    // FR-PLACE-01: Google Places 단일 소스 검색. 결과는 24시간 DB 캐시를 우선 사용한다.
    @RequiredGroupMember
    @GetMapping("/search")
    @Operation(
            summary = "장소 검색",
            description = """
                    FR-PLACE-01: 키워드(필수)와 카테고리(선택)로 Google Places를 검색한다.
                    카테고리는 Google includedType으로 매핑되며, 미지정 시 전체 검색이다.
                    동일 (검색어+카테고리+지역) 조합은 24시간 DB 캐시를 우선 사용해 Google 호출량을 통제한다.
                    검색 시점에는 Place Details를 호출하지 않는다.
                    """
    )
    public ResponseEntity<ApiResponse<List<PlaceSearchResult>>> search(
            @Parameter(description = "검색할 그룹 ID", example = "1")
            @PathVariable Long groupId,
            @Parameter(description = "검색 키워드", example = "강남 카페")
            @RequestParam(required = false) String query,
            @Parameter(description = "카테고리 필터(미지정 시 전체)", example = "CAFE")
            @RequestParam(required = false) PlaceCategory category,
            @Parameter(description = "다음 페이지 토큰(무한 스크롤용, 첫 페이지는 생략)")
            @RequestParam(required = false) String pageToken
    ) {
        PlaceSearchPage page = placeService.search(groupId, query, category, pageToken);
        ResponseEntity.BodyBuilder builder = ResponseEntity.ok();
        // 배열 응답 계약을 유지하기 위해 다음 페이지 토큰은 헤더로 내린다(없으면 마지막 페이지).
        if (page.nextPageToken() != null) {
            builder.header(NEXT_PAGE_TOKEN_HEADER, page.nextPageToken());
        }
        return builder.body(ApiResponse.success("장소 검색 성공", page.results()));
    }

    // FR-PLACE-02: 검색 결과를 그룹 보관함에 추가한다. 추가 시점에만 Place Details를 호출한다.
    @RequiredGroupMember
    @PostMapping
    @Operation(
            summary = "보관함 추가",
            description = """
                    FR-PLACE-02: Google placeId로 장소를 그룹 보관함에 추가한다.
                    추가 시점에 Place Details를 호출해 전화/영업시간 등을 보강하며(7일 캐시),
                    같은 그룹에 동일 장소가 이미 있으면 중복으로 거부한다.
                    """
    )
    public ResponseEntity<ApiResponse<BookmarkResponse>> addBookmark(
            @Parameter(description = "그룹 ID", example = "1")
            @PathVariable Long groupId,
            @RequestBody @Valid BookmarkCreateRequest request
    ) {
        BookmarkResponse response = placeService.addBookmark(groupId, request);
        return ResponseEntity.ok(ApiResponse.success("보관함에 추가되었습니다.", response));
    }

    // FR-PLACE-03: 그룹 보관함 목록을 필터/정렬해 조회한다.
    @RequiredGroupMember
    @GetMapping
    @Operation(
            summary = "보관함 조회",
            description = """
                    FR-PLACE-03: 그룹 멤버가 보관함 목록을 조회한다.
                    카테고리/추가자/가격대 필터와 최근추가·평점·이름 정렬을 지원한다.
                    """
    )
    public ResponseEntity<ApiResponse<List<BookmarkResponse>>> getBookmarks(
            @Parameter(description = "그룹 ID", example = "1")
            @PathVariable Long groupId,
            @Parameter(description = "카테고리 필터", example = "RESTAURANT")
            @RequestParam(required = false) PlaceCategory category,
            @Parameter(description = "추가자 사용자 ID 필터", example = "2")
            @RequestParam(required = false) Long creatorId,
            @Parameter(description = "가격대 필터", example = "PRICE_LEVEL_MODERATE")
            @RequestParam(required = false) String priceLevel,
            @Parameter(description = "정렬 기준", example = "RECENT")
            @RequestParam(defaultValue = "RECENT") BookmarkSort sort
    ) {
        List<BookmarkResponse> response = placeService.getBookmarks(groupId, category, creatorId, priceLevel, sort);
        return ResponseEntity.ok(ApiResponse.success("보관함 조회 성공", response));
    }

    // 구글 리뷰 AI 요약(지연 실행): '리뷰 보기' 클릭 시점에만 호출. 결과는 7일 인메모리 캐시.
    @RequiredGroupMember
    @GetMapping("/{googlePlaceId}/review-summary")
    @Operation(
            summary = "구글 리뷰 AI 요약",
            description = """
                    장소/숙소의 구글 대표 리뷰(최대 5개)를 가져와 AI(Gemini)로 한국어 요약한다.
                    토큰 절약을 위해 클릭 시점에만 호출하며 googlePlaceId 기준으로 7일 캐시한다.
                    리뷰가 부족하거나 AI 키 미설정이면 available=false로 안내한다.
                    """
    )
    public ResponseEntity<ApiResponse<ReviewSummaryResponse>> reviewSummary(
            @Parameter(description = "그룹 ID", example = "1")
            @PathVariable Long groupId,
            @Parameter(description = "Google Place ID")
            @PathVariable String googlePlaceId
    ) {
        ReviewSummaryResponse response = reviewSummaryService.summarize(groupId, googlePlaceId);
        return ResponseEntity.ok(ApiResponse.success("리뷰 요약 조회 성공", response));
    }

    // FR-PLACE-04: 추가자 본인 또는 Owner가 보관함 항목을 수정한다.
    @RequiredGroupMember
    @PatchMapping("/{bookmarkId}")
    @Operation(
            summary = "보관함 항목 수정",
            description = "FR-PLACE-04: 추가자 본인 또는 그룹 Owner가 카테고리 태그/메모/개인 별점을 수정한다."
    )
    public ResponseEntity<ApiResponse<BookmarkResponse>> updateBookmark(
            @Parameter(description = "그룹 ID", example = "1")
            @PathVariable Long groupId,
            @Parameter(description = "보관함 항목 ID", example = "10")
            @PathVariable Long bookmarkId,
            @RequestBody @Valid BookmarkUpdateRequest request
    ) {
        BookmarkResponse response = placeService.updateBookmark(groupId, bookmarkId, request);
        return ResponseEntity.ok(ApiResponse.success("보관함 항목이 수정되었습니다.", response));
    }

    // FR-PLACE-04: 추가자 본인 또는 Owner가 보관함 항목을 삭제한다.
    @RequiredGroupMember
    @DeleteMapping("/{bookmarkId}")
    @Operation(
            summary = "보관함 항목 삭제",
            description = "FR-PLACE-04: 추가자 본인 또는 그룹 Owner가 보관함 항목을 삭제한다."
    )
    public ResponseEntity<ApiResponse<Void>> deleteBookmark(
            @Parameter(description = "그룹 ID", example = "1")
            @PathVariable Long groupId,
            @Parameter(description = "보관함 항목 ID", example = "10")
            @PathVariable Long bookmarkId
    ) {
        placeService.deleteBookmark(groupId, bookmarkId);
        return ResponseEntity.ok(ApiResponse.success("보관함 항목이 삭제되었습니다."));
    }
}
