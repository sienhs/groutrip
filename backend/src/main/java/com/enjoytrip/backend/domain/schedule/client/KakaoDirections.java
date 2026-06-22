package com.enjoytrip.backend.domain.schedule.client;

/**
 * EI-02-A: 카카오 모빌리티 자동차 길찾기 응답에서 추출한 이동 정보.
 * 연료비는 거리 기반 자체 계산이므로 여기 포함하지 않고 서비스에서 산출한다.
 */
public record KakaoDirections(
        int distanceMeters,
        int durationSeconds,
        int toll,      // 톨게이트 비용(원)
        int taxiFare   // 예상 택시 요금(원)
) {
}
