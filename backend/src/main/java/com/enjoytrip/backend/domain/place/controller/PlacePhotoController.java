package com.enjoytrip.backend.domain.place.controller;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;

import org.springframework.http.CacheControl;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.enjoytrip.backend.domain.place.client.GooglePlacesClient;
import com.enjoytrip.backend.domain.place.client.GooglePlacesClient.PhotoData;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;

/**
 * EI-01-C: Place Photos 프록시.
 * Google 미디어 호출은 API 키가 필요하므로 BE에서만 수행하고, FE에는 이 경로만 노출한다.
 * 검색/보관함 응답의 photoUrl이 이 엔드포인트를 가리킨다.
 */
@RestController
@RequestMapping("/api/places/photo")
@RequiredArgsConstructor
@Tag(name = "Place Photo", description = "Google Place 썸네일 프록시 API")
public class PlacePhotoController {

    private static final int DEFAULT_MAX_WIDTH = 400;

    private final GooglePlacesClient googlePlacesClient;

    // 검색/보관함 응답에 넣을 프록시 URL을 만든다. photoName이 슬래시를 포함하므로 인코딩한다.
    public static String proxyUrl(String photoName) {
        String encoded = URLEncoder.encode(photoName, StandardCharsets.UTF_8);
        return "/api/places/photo?name=" + encoded + "&maxWidthPx=" + DEFAULT_MAX_WIDTH;
    }

    @GetMapping
    @Operation(summary = "장소 썸네일 조회", description = "Google Place Photos를 BE 프록시로 스트리밍한다. (키 노출 방지)")
    public ResponseEntity<byte[]> getPhoto(
            @RequestParam String name,
            @RequestParam(defaultValue = "400") int maxWidthPx
    ) {
        PhotoData photo = googlePlacesClient.fetchPhoto(name, maxWidthPx);
        return ResponseEntity.ok()
                .contentType(photo.contentType())
                .cacheControl(CacheControl.maxAge(java.time.Duration.ofDays(7))) // 썸네일은 변동 적음
                .body(photo.data());
    }
}
