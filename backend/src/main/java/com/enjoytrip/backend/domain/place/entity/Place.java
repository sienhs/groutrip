package com.enjoytrip.backend.domain.place.entity;

import java.time.LocalDateTime;

import com.enjoytrip.backend.global.entity.BaseEntity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

/**
 * Google Place ID 단위의 장소 마스터.
 * 여러 그룹의 보관함이 같은 장소를 참조하므로 googlePlaceId로 전역 1건만 유지한다.
 * NFR-PERF: Place Details(전화/영업시간 등)는 보관함 추가 시점에만 호출하고
 * 이 레코드에 7일 캐시한다({@link #detailsFetchedAt}).
 */
@Entity
@Table(name = "places")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Place extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // Google Place ID. 장소 마스터의 자연키이자 보관함 중복 판정 기준이다.
    @Column(nullable = false, unique = true, length = 255)
    private String googlePlaceId;

    @Column(nullable = false, length = 255)
    private String name;

    @Column(length = 500)
    private String address;

    @Column(nullable = false)
    private double latitude;

    @Column(nullable = false)
    private double longitude;

    // Google types 원본(콤마 결합). 표시/카테고리 역매핑에 사용한다.
    @Column(length = 500)
    private String types;

    @Column(length = 30)
    private String priceLevel; // PRICE_LEVEL_FREE ~ VERY_EXPENSIVE

    private Double rating;

    private Integer ratingCount;

    // Place Photos 리소스 이름(places/{id}/photos/{ref}). 실제 이미지는 BE 프록시로 스트리밍한다.
    @Column(length = 500)
    private String photoName;

    @Column(length = 500)
    private String googleMapsUri;

    // --- Place Details에서 보강하는 상세 정보 (보관함 추가 시점 호출) ---
    @Column(length = 50)
    private String phoneNumber;

    @Column(length = 2000)
    private String openingHours; // 요일별 영업시간 문자열(줄바꿈 결합)

    @Column(length = 500)
    private String websiteUri;

    // Place Details 캐시 만료 판정 기준(7일).
    private LocalDateTime detailsFetchedAt;

    @Builder
    private Place(String googlePlaceId, String name, String address, double latitude, double longitude,
                  String types, String priceLevel, Double rating, Integer ratingCount,
                  String photoName, String googleMapsUri, String phoneNumber, String openingHours,
                  String websiteUri, LocalDateTime detailsFetchedAt) {
        this.googlePlaceId = googlePlaceId;
        this.name = name;
        this.address = address;
        this.latitude = latitude;
        this.longitude = longitude;
        this.types = types;
        this.priceLevel = priceLevel;
        this.rating = rating;
        this.ratingCount = ratingCount;
        this.photoName = photoName;
        this.googleMapsUri = googleMapsUri;
        this.phoneNumber = phoneNumber;
        this.openingHours = openingHours;
        this.websiteUri = websiteUri;
        this.detailsFetchedAt = detailsFetchedAt;
    }

    // Place Details 재호출 시 마스터 정보를 최신 응답으로 갱신한다.
    public void refreshDetails(String name, String address, double latitude, double longitude,
                               String types, String priceLevel, Double rating, Integer ratingCount,
                               String photoName, String googleMapsUri, String phoneNumber,
                               String openingHours, String websiteUri, LocalDateTime detailsFetchedAt) {
        this.name = name;
        this.address = address;
        this.latitude = latitude;
        this.longitude = longitude;
        this.types = types;
        this.priceLevel = priceLevel;
        this.rating = rating;
        this.ratingCount = ratingCount;
        this.photoName = photoName;
        this.googleMapsUri = googleMapsUri;
        this.phoneNumber = phoneNumber;
        this.openingHours = openingHours;
        this.websiteUri = websiteUri;
        this.detailsFetchedAt = detailsFetchedAt;
    }

    // NFR-PERF: Place Details 캐시(7일) 유효 여부.
    public boolean isDetailsFresh(LocalDateTime now) {
        return detailsFetchedAt != null && detailsFetchedAt.isAfter(now.minusDays(7));
    }
}
