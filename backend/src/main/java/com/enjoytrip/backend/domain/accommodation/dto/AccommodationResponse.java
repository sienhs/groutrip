package com.enjoytrip.backend.domain.accommodation.dto;

import java.time.LocalDate;
import java.time.LocalDateTime;

import com.enjoytrip.backend.domain.accommodation.entity.Accommodation;
import com.enjoytrip.backend.domain.accommodation.entity.BookingStatus;
import com.enjoytrip.backend.domain.place.dto.PlaceResponse;

/**
 * 숙소 선정/예약 응답.
 * {@code bookingSearchUrl}은 네이버 호텔 가격비교(통합검색) 딥링크,
 * {@code bookingPhotoUrl}은 예약완료 사진을 인증 조회하는 BE 경로(없으면 null)다.
 */
public record AccommodationResponse(
        Long id,
        PlaceResponse place,
        String sigungu,
        LocalDate stayDate,
        BookingStatus status,
        Long reservationPrice,
        String bookingPhotoUrl,
        String bookingSearchUrl,
        LocalDateTime createdAt
) {

    public static AccommodationResponse from(Accommodation acc, PlaceResponse place,
                                             String bookingPhotoUrl, String bookingSearchUrl) {
        return new AccommodationResponse(
                acc.getId(),
                place,
                acc.getSigungu(),
                acc.getStayDate(),
                acc.getStatus(),
                acc.getReservationPrice(),
                bookingPhotoUrl,
                bookingSearchUrl,
                acc.getCreatedAt()
        );
    }
}
