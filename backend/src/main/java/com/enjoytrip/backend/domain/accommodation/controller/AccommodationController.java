package com.enjoytrip.backend.domain.accommodation.controller;

import java.util.List;

import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import com.enjoytrip.backend.domain.accommodation.dto.AccommodationResponse;
import com.enjoytrip.backend.domain.accommodation.dto.AccommodationSelectRequest;
import com.enjoytrip.backend.domain.accommodation.service.AccommodationService;
import com.enjoytrip.backend.domain.accommodation.service.AccommodationService.BookingPhoto;
import com.enjoytrip.backend.domain.group.aop.RequiredGroupMember;
import com.enjoytrip.backend.global.response.ApiResponse;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

/**
 * 그룹 여행 계획 - 숙소 선정/예약 API. 모든 진입점은 그룹 멤버 권한이 필요하다.
 */
@RestController
@RequestMapping("/api/groups/{groupId}/accommodations")
@RequiredArgsConstructor
@Tag(name = "Accommodation", description = "그룹 숙소 선정 및 예약 핸드오프 API")
public class AccommodationController {

    private final AccommodationService accommodationService;

    @RequiredGroupMember
    @PostMapping
    @Operation(summary = "숙소 선정", description = "Google placeId로 숙소를 선정한다(SELECTED). 응답의 bookingSearchUrl로 최저가 사이트 핸드오프.")
    public ResponseEntity<ApiResponse<AccommodationResponse>> select(
            @PathVariable Long groupId,
            @RequestBody @Valid AccommodationSelectRequest request
    ) {
        AccommodationResponse response = accommodationService.select(groupId, request);
        return ResponseEntity.ok(ApiResponse.success("숙소를 선정했습니다.", response));
    }

    @RequiredGroupMember
    @GetMapping
    @Operation(summary = "숙소 선정 목록", description = "그룹의 숙소 선정/예약 목록(최근순). 계획 재진입 시 상태 복원에 사용한다.")
    public ResponseEntity<ApiResponse<List<AccommodationResponse>>> list(@PathVariable Long groupId) {
        return ResponseEntity.ok(ApiResponse.success("숙소 목록 조회 성공", accommodationService.list(groupId)));
    }

    @RequiredGroupMember
    @PostMapping(value = "/{accommodationId}/booking", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @Operation(
            summary = "예약 완료 확정",
            description = "외부 예약 후 예약가(reservationPrice) 또는 예약완료 사진(photo) 중 최소 하나를 입력해 BOOKED로 확정한다."
    )
    public ResponseEntity<ApiResponse<AccommodationResponse>> confirmBooking(
            @PathVariable Long groupId,
            @PathVariable Long accommodationId,
            @Parameter(description = "예약 금액(원)") @RequestParam(required = false) Long reservationPrice,
            @Parameter(description = "예약완료 사진(가격 포함)") @RequestParam(required = false) MultipartFile photo
    ) {
        AccommodationResponse response = accommodationService.confirmBooking(groupId, accommodationId, reservationPrice, photo);
        return ResponseEntity.ok(ApiResponse.success("예약 완료를 기록했습니다.", response));
    }

    @RequiredGroupMember
    @GetMapping("/{accommodationId}/photo")
    @Operation(summary = "예약완료 사진 조회", description = "그룹 멤버가 예약완료 사진을 조회한다(인증 필요).")
    public ResponseEntity<byte[]> photo(@PathVariable Long groupId, @PathVariable Long accommodationId) {
        BookingPhoto photo = accommodationService.loadPhoto(groupId, accommodationId);
        MediaType mediaType = photo.contentType() == null
                ? MediaType.IMAGE_JPEG
                : MediaType.parseMediaType(photo.contentType());
        return ResponseEntity.ok().contentType(mediaType).body(photo.data());
    }
}
