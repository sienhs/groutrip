package com.enjoytrip.backend.domain.schedule.entity;

import java.time.LocalDateTime;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

/**
 * EI-02-D / FR-SCHEDULE-04: (출발지, 도착지, 수단) 쌍의 이동 정보 1시간 캐시.
 * 카카오 모빌리티 호출량을 통제하기 위해 좌표+수단으로 정규화한 cacheKey로 식별한다.
 */
@Entity
@Table(name = "transport_legs")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class TransportLeg {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // (출발 좌표 + 도착 좌표 + 수단)을 정규화한 캐시 키.
    @Column(nullable = false, unique = true, length = 200)
    private String cacheKey;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private TransportMode mode;

    // 제공 가능 여부(대중교통 미지원 시 false).
    @Column(nullable = false)
    private boolean available;

    private Integer durationSeconds;
    private Integer distanceMeters;

    // 자동차
    private Integer toll;
    private Integer fuelCost;
    private Integer taxiFare;

    // 대중교통
    private Integer transitFare;
    private Integer transferCount;

    @Column(length = 500)
    private String routeSummary;

    @Column(length = 200)
    private String note;

    @Column(nullable = false)
    private LocalDateTime expiresAt;

    @Column(nullable = false)
    private LocalDateTime createdAt;

    @Builder
    private TransportLeg(String cacheKey, TransportMode mode, boolean available, Integer durationSeconds,
                         Integer distanceMeters, Integer toll, Integer fuelCost, Integer taxiFare,
                         Integer transitFare, Integer transferCount, String routeSummary, String note,
                         LocalDateTime expiresAt) {
        this.cacheKey = cacheKey;
        this.mode = mode;
        this.available = available;
        this.durationSeconds = durationSeconds;
        this.distanceMeters = distanceMeters;
        this.toll = toll;
        this.fuelCost = fuelCost;
        this.taxiFare = taxiFare;
        this.transitFare = transitFare;
        this.transferCount = transferCount;
        this.routeSummary = routeSummary;
        this.note = note;
        this.expiresAt = expiresAt;
        this.createdAt = LocalDateTime.now();
    }

    public boolean isExpired(LocalDateTime now) {
        return now.isAfter(expiresAt);
    }

    // 동일 (출발지, 도착지, 수단) 재요청 시 1시간 캐시를 갱신한다.
    public void refresh(boolean available, Integer durationSeconds, Integer distanceMeters, Integer toll,
                        Integer fuelCost, Integer taxiFare, Integer transitFare, Integer transferCount,
                        String routeSummary, String note, LocalDateTime expiresAt) {
        this.available = available;
        this.durationSeconds = durationSeconds;
        this.distanceMeters = distanceMeters;
        this.toll = toll;
        this.fuelCost = fuelCost;
        this.taxiFare = taxiFare;
        this.transitFare = transitFare;
        this.transferCount = transferCount;
        this.routeSummary = routeSummary;
        this.note = note;
        this.expiresAt = expiresAt;
        this.createdAt = LocalDateTime.now();
    }
}
