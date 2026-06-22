package com.enjoytrip.backend.domain.place.entity;

import java.util.List;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

/**
 * EI-01-B: 우리 카테고리 ↔ Google includedType 매핑.
 * 검색 시에는 {@link #includedType}을 Google Text Search 필터로 사용하고,
 * 검색 결과의 Google types를 우리 카테고리로 역매핑할 때 {@link #fromGoogleTypes(List)}를 사용한다.
 */
@Getter
@RequiredArgsConstructor
public enum PlaceCategory {

    LODGING("lodging"),              // 숙소: 호텔/모텔/펜션/게스트하우스 통합
    RESTAURANT("restaurant"),        // 맛집: 일반 음식점
    CAFE("cafe"),                    // 카페: 커피숍/디저트
    TOURIST_ATTRACTION("tourist_attraction"), // 명소: 관광지/박물관/공원
    SHOPPING("shopping_mall"),       // 쇼핑: 쇼핑몰/상점
    ETC(null);                       // 기타: includedType 필터 없음 (전체 검색)

    // 검색 시 Google에 전달할 includedType. ETC는 필터를 걸지 않는다.
    private final String includedType;

    public boolean hasIncludedType() {
        return includedType != null;
    }

    // 검색 결과의 Google types 배열을 우리 카테고리로 역매핑한다(표시/태그 기본값 용).
    public static PlaceCategory fromGoogleTypes(List<String> types) {
        if (types == null || types.isEmpty()) {
            return ETC;
        }
        if (types.contains("lodging")) {
            return LODGING;
        }
        if (types.contains("cafe")) {
            return CAFE;
        }
        if (types.contains("restaurant") || types.contains("food")) {
            return RESTAURANT;
        }
        if (types.contains("tourist_attraction") || types.contains("museum") || types.contains("park")) {
            return TOURIST_ATTRACTION;
        }
        if (types.contains("shopping_mall") || types.contains("store") || types.contains("department_store")) {
            return SHOPPING;
        }
        return ETC;
    }
}
