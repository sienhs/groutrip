package com.enjoytrip.backend.domain.place.dto;

import java.util.Arrays;
import java.util.List;

import com.enjoytrip.backend.domain.place.entity.Place;

/**
 * 보관함 응답에 포함되는 장소 마스터 정보. Place Details에서 보강한 상세 필드를 함께 노출한다.
 * {@code photoUrl}은 BE 사진 프록시 경로다.
 */
public record PlaceResponse(
        Long placeId,        // 내부 Place id. 일정 생성/투표 후보 등록(placeId)에 사용한다.
        String googlePlaceId,
        String name,
        String address,
        double latitude,
        double longitude,
        List<String> types,
        Double rating,
        Integer ratingCount,
        String priceLevel,
        String photoUrl,
        String googleMapsUri,
        String phoneNumber,
        String openingHours,
        String websiteUri
) {

    public static PlaceResponse from(Place place, String photoUrl) {
        List<String> types = (place.getTypes() == null || place.getTypes().isBlank())
                ? List.of()
                : Arrays.asList(place.getTypes().split(","));
        return new PlaceResponse(
                place.getId(),
                place.getGooglePlaceId(),
                place.getName(),
                place.getAddress(),
                place.getLatitude(),
                place.getLongitude(),
                types,
                place.getRating(),
                place.getRatingCount(),
                place.getPriceLevel(),
                photoUrl,
                place.getGoogleMapsUri(),
                place.getPhoneNumber(),
                place.getOpeningHours(),
                place.getWebsiteUri()
        );
    }
}
