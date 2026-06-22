package com.enjoytrip.backend.domain.schedule.service;

import java.time.LocalDateTime;
import java.util.Locale;
import java.util.Optional;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.enjoytrip.backend.domain.auth.entity.User;
import com.enjoytrip.backend.domain.group.service.CurrentUserResolver;
import com.enjoytrip.backend.domain.group.service.GroupAccessValidator;
import com.enjoytrip.backend.domain.place.entity.Place;
import com.enjoytrip.backend.domain.schedule.client.KakaoDirections;
import com.enjoytrip.backend.domain.schedule.client.KakaoMobilityClient;
import com.enjoytrip.backend.domain.schedule.dto.TransportLegResponse;
import com.enjoytrip.backend.domain.schedule.entity.Schedule;
import com.enjoytrip.backend.domain.schedule.entity.TransportLeg;
import com.enjoytrip.backend.domain.schedule.entity.TransportMode;
import com.enjoytrip.backend.domain.schedule.repository.ScheduleRepository;
import com.enjoytrip.backend.domain.schedule.repository.TransportLegRepository;
import com.enjoytrip.backend.global.exception.BusinessException;
import com.enjoytrip.backend.global.exception.ErrorCode;

import lombok.RequiredArgsConstructor;

/**
 * FR-SCHEDULE-04 / EI-02: 두 일정 사이의 이동 시간·비용 계산.
 * (출발지, 도착지, 수단) 쌍을 1시간 캐시하고, 자동차는 카카오 모빌리티, 도보는 좌표 추정으로 산출한다.
 * 대중교통은 공개 API 미지원이라 available=false로 응답한다.
 */
@Service
@RequiredArgsConstructor
@Transactional
public class TransportService {

    private static final double FUEL_EFFICIENCY_KM_PER_L = 13.0; // EI-02-A 자체 계산식
    private static final int FUEL_PRICE_PER_L = 1700;
    private static final double WALK_SPEED_MPS = 1.1;            // 약 4km/h
    private static final double WALK_PATH_FACTOR = 1.3;          // 직선거리 → 보행 경로 보정
    private static final int CACHE_HOURS = 1;                    // EI-02-D

    private final KakaoMobilityClient kakaoMobilityClient;
    private final TransportLegRepository transportLegRepository;
    private final ScheduleRepository scheduleRepository;
    private final CurrentUserResolver currentUserResolver;
    private final GroupAccessValidator groupAccessValidator;

    public TransportLegResponse getLeg(Long groupId, Long fromScheduleId, Long toScheduleId, TransportMode mode) {
        User user = currentUserResolver.getCurrentUser();
        groupAccessValidator.validateMember(groupId, user.getId());

        Place origin = findSchedule(groupId, fromScheduleId).getPlace();
        Place destination = findSchedule(groupId, toScheduleId).getPlace();

        String cacheKey = cacheKey(mode, origin, destination);
        LocalDateTime now = LocalDateTime.now();

        Optional<TransportLeg> cached = transportLegRepository.findByCacheKey(cacheKey);
        if (cached.isPresent() && !cached.get().isExpired(now)) {
            return TransportLegResponse.from(cached.get());
        }

        Computed c = compute(mode, origin, destination);
        LocalDateTime expiresAt = now.plusHours(CACHE_HOURS);
        TransportLeg leg = cached
                .map(existing -> {
                    existing.refresh(c.available(), c.durationSeconds(), c.distanceMeters(), c.toll(),
                            c.fuelCost(), c.taxiFare(), c.transitFare(), c.transferCount(),
                            c.routeSummary(), c.note(), expiresAt);
                    return existing;
                })
                .orElseGet(() -> transportLegRepository.save(TransportLeg.builder()
                        .cacheKey(cacheKey)
                        .mode(mode)
                        .available(c.available())
                        .durationSeconds(c.durationSeconds())
                        .distanceMeters(c.distanceMeters())
                        .toll(c.toll())
                        .fuelCost(c.fuelCost())
                        .taxiFare(c.taxiFare())
                        .transitFare(c.transitFare())
                        .transferCount(c.transferCount())
                        .routeSummary(c.routeSummary())
                        .note(c.note())
                        .expiresAt(expiresAt)
                        .build()));
        return TransportLegResponse.from(leg);
    }

    private Computed compute(TransportMode mode, Place origin, Place destination) {
        return switch (mode) {
            case CAR -> {
                KakaoDirections d = kakaoMobilityClient.getCarDirections(
                        origin.getLongitude(), origin.getLatitude(),
                        destination.getLongitude(), destination.getLatitude());
                int fuelCost = (int) Math.round(d.distanceMeters() / 1000.0 / FUEL_EFFICIENCY_KM_PER_L * FUEL_PRICE_PER_L);
                yield new Computed(true, d.durationSeconds(), d.distanceMeters(),
                        d.toll(), fuelCost, d.taxiFare(), null, null, null, null);
            }
            case WALK -> {
                double straight = haversineMeters(origin, destination);
                int distance = (int) Math.round(straight * WALK_PATH_FACTOR);
                int duration = (int) Math.round(distance / WALK_SPEED_MPS);
                yield new Computed(true, duration, distance,
                        null, null, null, null, null, null, "직선거리 기반 도보 추정치");
            }
            case TRANSIT -> new Computed(false, null, null, null, null, null, null, null, null,
                    "카카오 대중교통 길찾기 미지원 (ODsay 연동 예정)");
        };
    }

    private Schedule findSchedule(Long groupId, Long scheduleId) {
        return scheduleRepository.findByIdAndTravelGroupId(scheduleId, groupId)
                .orElseThrow(() -> new BusinessException(ErrorCode.SCHEDULE_NOT_FOUND));
    }

    private String cacheKey(TransportMode mode, Place origin, Place destination) {
        return String.format(Locale.US, "%s|%.5f,%.5f|%.5f,%.5f",
                mode, origin.getLatitude(), origin.getLongitude(),
                destination.getLatitude(), destination.getLongitude());
    }

    // 도보 거리 추정을 위한 두 좌표 간 직선(대권) 거리(m).
    private double haversineMeters(Place origin, Place destination) {
        double earthRadius = 6_371_000;
        double dLat = Math.toRadians(destination.getLatitude() - origin.getLatitude());
        double dLng = Math.toRadians(destination.getLongitude() - origin.getLongitude());
        double a = Math.sin(dLat / 2) * Math.sin(dLat / 2)
                + Math.cos(Math.toRadians(origin.getLatitude())) * Math.cos(Math.toRadians(destination.getLatitude()))
                * Math.sin(dLng / 2) * Math.sin(dLng / 2);
        return earthRadius * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    }

    // 수단별 계산 결과를 캐시 엔티티로 옮기기 위한 내부 보관용.
    private record Computed(
            boolean available, Integer durationSeconds, Integer distanceMeters,
            Integer toll, Integer fuelCost, Integer taxiFare,
            Integer transitFare, Integer transferCount, String routeSummary, String note
    ) {
    }
}
