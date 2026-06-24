package com.enjoytrip.backend.domain.accommodation.entity;

import java.time.LocalDate;

import com.enjoytrip.backend.domain.auth.entity.User;
import com.enjoytrip.backend.domain.group.entity.TravelGroup;
import com.enjoytrip.backend.domain.place.entity.Place;
import com.enjoytrip.backend.global.entity.BaseEntity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

/**
 * 그룹 여행 계획의 숙소 선정/예약 단위.
 *
 * 사용자가 시/군/구의 숙소(Google Places lodging)를 고르면 SELECTED로 생성되고,
 * 외부 최저가 사이트에서 예약을 마친 뒤 예약가 또는 예약완료 사진을 입력하면 BOOKED가 된다.
 *
 * 예약완료 사진 바이트는 S3에 저장하고 엔티티에는 object key만 보관한다.
 */
@Entity
@Table(name = "group_accommodations")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Accommodation extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "group_id", nullable = false)
    private TravelGroup travelGroup;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "place_id", nullable = false)
    private Place place;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "created_by", nullable = false)
    private User createdBy;

    // 추천/검색 스코프로 쓰는 시/군/구(예: "용인시"). 상세주소 경로에서는 null일 수 있다.
    @Column(length = 100)
    private String sigungu;

    // 날짜별 숙소 선택용 숙박 시작일(체크인 기준 첫 박). null이면 날짜 미지정(하위 호환).
    @Column(name = "stay_date")
    private LocalDate stayDate;

    // 한 숙소가 여러 박을 커버할 때 마지막 숙박일. null이면 stayDate와 동일(1박).
    @Column(name = "stay_end_date")
    private LocalDate stayEndDate;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private BookingStatus status;

    // 사용자가 외부 예약 후 입력한 예약 금액(원). 사진만 올린 경우 null.
    private Long reservationPrice;

    // 예약완료 사진(가격 포함 스크린샷 등)의 S3 object key. 사진 엔드포인트로만 로드한다.
    @Column(name = "booking_photo_key", length = 255)
    private String bookingPhotoKey;

    @Column(name = "booking_photo_content_type", length = 100)
    private String bookingPhotoContentType;

    @Builder
    private Accommodation(TravelGroup travelGroup, Place place, User createdBy,
                          String sigungu, LocalDate stayDate, LocalDate stayEndDate, BookingStatus status) {
        this.travelGroup = travelGroup;
        this.place = place;
        this.createdBy = createdBy;
        this.sigungu = sigungu;
        this.stayDate = stayDate;
        this.stayEndDate = stayEndDate;
        this.status = status;
    }

    /** 외부 예약 완료 처리. 예약가/사진 중 전달된 값만 갱신하고 상태를 BOOKED로 올린다. */
    public void markBooked(Long reservationPrice, String photoKey, String photoContentType) {
        this.status = BookingStatus.BOOKED;
        if (reservationPrice != null) {
            this.reservationPrice = reservationPrice;
        }
        if (photoKey != null && !photoKey.isBlank()) {
            this.bookingPhotoKey = photoKey;
            this.bookingPhotoContentType = photoContentType;
        }
    }

    public boolean hasPhoto() {
        return bookingPhotoKey != null && !bookingPhotoKey.isBlank();
    }
}
