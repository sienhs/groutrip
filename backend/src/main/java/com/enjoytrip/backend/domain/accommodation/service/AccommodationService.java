package com.enjoytrip.backend.domain.accommodation.service;

import java.io.IOException;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import com.enjoytrip.backend.domain.accommodation.dto.AccommodationResponse;
import com.enjoytrip.backend.domain.accommodation.dto.AccommodationSelectRequest;
import com.enjoytrip.backend.domain.accommodation.entity.Accommodation;
import com.enjoytrip.backend.domain.accommodation.entity.BookingStatus;
import com.enjoytrip.backend.domain.accommodation.repository.AccommodationRepository;
import com.enjoytrip.backend.domain.auth.entity.User;
import com.enjoytrip.backend.domain.expense.dto.ExpenseCreateRequest;
import com.enjoytrip.backend.domain.expense.entity.ExpenseCategory;
import com.enjoytrip.backend.domain.expense.entity.SplitType;
import com.enjoytrip.backend.domain.expense.service.ExpenseService;
import com.enjoytrip.backend.domain.group.entity.TravelGroup;
import com.enjoytrip.backend.domain.group.repository.GroupMemberRepository;
import com.enjoytrip.backend.domain.group.repository.TravelGroupRepository;
import com.enjoytrip.backend.domain.group.service.CurrentUserResolver;
import com.enjoytrip.backend.domain.group.service.GroupAccessValidator;
import com.enjoytrip.backend.domain.place.controller.PlacePhotoController;
import com.enjoytrip.backend.domain.place.dto.PlaceResponse;
import com.enjoytrip.backend.domain.place.entity.Place;
import com.enjoytrip.backend.domain.place.entity.PlaceCategory;
import com.enjoytrip.backend.domain.place.service.PlaceService;
import com.enjoytrip.backend.global.exception.BusinessException;
import com.enjoytrip.backend.global.exception.ErrorCode;
import com.enjoytrip.backend.global.storage.ObjectStorageService;

import lombok.RequiredArgsConstructor;

/**
 * 그룹 여행 계획 - 숙소 선정 및 예약 완료 처리.
 *
 * 숙소는 Google Places 단일 소스(lodging)에서 선정하고, 예약은 외부 최저가 사이트로
 * 핸드오프한 뒤 사용자가 돌아와 예약가 또는 예약완료 사진을 입력해 BOOKED로 확정한다.
 */
@Service
@RequiredArgsConstructor
@Transactional
public class AccommodationService {

    private static final long MAX_PHOTO_BYTES = 10L * 1024 * 1024; // 10MB
    private static final String PHOTO_STORAGE_PREFIX = "booking-photos";

    private final AccommodationRepository accommodationRepository;
    private final TravelGroupRepository travelGroupRepository;
    private final PlaceService placeService;
    private final ExpenseService expenseService;
    private final GroupMemberRepository groupMemberRepository;
    private final CurrentUserResolver currentUserResolver;
    private final GroupAccessValidator groupAccessValidator;
    private final ObjectStorageService objectStorage;

    /** 숙소 선정. googlePlaceId로 Place 마스터를 확보(Details 보강)하고 SELECTED로 기록한다. */
    public AccommodationResponse select(Long groupId, AccommodationSelectRequest request) {
        User user = currentUserResolver.getCurrentUser();
        groupAccessValidator.validateMember(groupId, user.getId());
        TravelGroup group = travelGroupRepository.findByIdAndDeletedAtIsNull(groupId)
                .orElseThrow(() -> new BusinessException(ErrorCode.GROUP_NOT_FOUND));

        Place place = placeService.resolvePlace(request.googlePlaceId());
        Accommodation acc = accommodationRepository.save(Accommodation.builder()
                .travelGroup(group)
                .place(place)
                .createdBy(user)
                .sigungu(request.sigungu())
                .stayDate(request.stayDate())
                .stayEndDate(request.stayEndDate() != null ? request.stayEndDate() : request.stayDate())
                .status(BookingStatus.SELECTED)
                .build());
        // 선정한 숙소를 그룹 보관함(LODGING)에도 등록해 '장소' 탭에 바로 보이게 한다.
        placeService.ensureBookmarked(group, place, user, PlaceCategory.LODGING);
        return toResponse(groupId, acc);
    }

    /** 그룹의 숙소 선정/예약 목록(최근순). 계획 재진입 시 진행 상태 복원에 쓴다. */
    @Transactional(readOnly = true)
    public List<AccommodationResponse> list(Long groupId) {
        User user = currentUserResolver.getCurrentUser();
        groupAccessValidator.validateMember(groupId, user.getId());
        return accommodationRepository.findByTravelGroupIdOrderByCreatedAtDesc(groupId).stream()
                .map(acc -> toResponse(groupId, acc))
                .toList();
    }

    /** 외부 예약 완료 확정. 예약가 또는 예약완료 사진 중 최소 하나는 있어야 한다. */
    public AccommodationResponse confirmBooking(Long groupId, Long accommodationId,
                                                Long reservationPrice, MultipartFile photo) {
        User user = currentUserResolver.getCurrentUser();
        groupAccessValidator.validateMember(groupId, user.getId());
        Accommodation acc = accommodationRepository.findByIdAndTravelGroupId(accommodationId, groupId)
                .orElseThrow(() -> new BusinessException(ErrorCode.NOT_FOUND));

        boolean hasPhoto = photo != null && !photo.isEmpty();
        if (reservationPrice == null && !hasPhoto) {
            throw new BusinessException(ErrorCode.INVALID_INPUT); // 가격/사진 모두 비어 있음
        }
        if (reservationPrice != null && reservationPrice < 0) {
            throw new BusinessException(ErrorCode.INVALID_INPUT);
        }

        String photoKey = null;
        String contentType = null;
        if (hasPhoto) {
            validateImage(photo);
            byte[] bytes;
            try {
                bytes = photo.getBytes();
            } catch (IOException e) {
                throw new BusinessException(ErrorCode.FILE_UPLOAD_FAILED);
            }
            contentType = photo.getContentType();
            photoKey = objectStorage.upload(PHOTO_STORAGE_PREFIX, bytes, contentType);
        }

        boolean firstBooking = acc.getStatus() != BookingStatus.BOOKED;
        String previousPhotoKey = photoKey != null ? acc.getBookingPhotoKey() : null;
        acc.markBooked(reservationPrice, photoKey, contentType);
        objectStorage.delete(previousPhotoKey);

        // 최초 예약 확정 + 금액이 있으면 숙박 지출을 정산에 자동 등록한다(FR-EXPENSE-01, 숙박/균등).
        // 재확정(이미 BOOKED) 시 중복 등록을 막는다 — 금액 정정은 정산 화면에서 직접 수정.
        if (firstBooking && reservationPrice != null && reservationPrice > 0) {
            registerLodgingExpense(groupId, user, acc, reservationPrice);
        }
        return toResponse(groupId, acc);
    }

    // FR-EXPENSE-01: 숙소 예약 금액을 숙박 카테고리·균등 분담 지출로 정산에 등록한다(결제자=확정한 사용자).
    private void registerLodgingExpense(Long groupId, User payer, Accommodation acc, long price) {
        List<Long> participantIds = groupMemberRepository.findByTravelGroupIdAndLeftAtIsNull(groupId).stream()
                .map(member -> member.getUser().getId())
                .toList();
        ExpenseCreateRequest request = new ExpenseCreateRequest(
                price,
                payer.getId(),
                ExpenseCategory.LODGING,
                SplitType.EQUAL,
                "[숙소] " + acc.getPlace().getName(),
                LocalDate.now(),
                participantIds,
                null
        );
        expenseService.create(groupId, request);
    }

    /** 숙소 선정 취소(삭제). 선정자 본인 또는 그룹 멤버(Owner 권한은 GroupAccessValidator에서 검증). */
    public void delete(Long groupId, Long accommodationId) {
        User user = currentUserResolver.getCurrentUser();
        groupAccessValidator.validateMember(groupId, user.getId());
        Accommodation acc = accommodationRepository.findByIdAndTravelGroupId(accommodationId, groupId)
                .orElseThrow(() -> new BusinessException(ErrorCode.NOT_FOUND));
        if (acc.getBookingPhotoKey() != null) {
            objectStorage.delete(acc.getBookingPhotoKey());
        }
        accommodationRepository.delete(acc);
    }

    /** 예약완료 사진 바이트 로드(그룹 멤버 전용). 컨트롤러가 이미지로 스트리밍한다. */
    @Transactional(readOnly = true)
    public BookingPhoto loadPhoto(Long groupId, Long accommodationId) {
        User user = currentUserResolver.getCurrentUser();
        groupAccessValidator.validateMember(groupId, user.getId());
        Accommodation acc = accommodationRepository.findByIdAndTravelGroupId(accommodationId, groupId)
                .orElseThrow(() -> new BusinessException(ErrorCode.NOT_FOUND));
        if (!acc.hasPhoto()) {
            throw new BusinessException(ErrorCode.NOT_FOUND);
        }
        return new BookingPhoto(objectStorage.download(acc.getBookingPhotoKey()), acc.getBookingPhotoContentType());
    }

    private void validateImage(MultipartFile file) {
        String contentType = file.getContentType();
        if (contentType == null || !contentType.startsWith("image/")) {
            throw new BusinessException(ErrorCode.INVALID_FILE_TYPE);
        }
        if (file.getSize() > MAX_PHOTO_BYTES) {
            throw new BusinessException(ErrorCode.INVALID_FILE_TYPE);
        }
    }

    private AccommodationResponse toResponse(Long groupId, Accommodation acc) {
        Place place = acc.getPlace();
        String photoUrl = place.getPhotoName() == null
                ? null
                : PlacePhotoController.proxyUrl(place.getPhotoName());
        PlaceResponse placeResponse = PlaceResponse.from(place, photoUrl);

        String bookingPhotoUrl = acc.hasPhoto()
                ? "/api/groups/" + groupId + "/accommodations/" + acc.getId() + "/photo"
                : null;
        String bookingSearchUrl = naverHotelSearchUrl(place.getName(), acc.getSigungu());
        return AccommodationResponse.from(acc, placeResponse, bookingPhotoUrl, bookingSearchUrl);
    }

    // 네이버 호텔 가격비교: 숙소명+지역으로 통합검색을 열면 최저가 비교 모듈이 노출된다.
    private String naverHotelSearchUrl(String name, String sigungu) {
        String keyword = (sigungu == null || sigungu.isBlank() ? "" : sigungu + " ") + name + " 숙소 최저가";
        return "https://search.naver.com/search.naver?query="
                + URLEncoder.encode(keyword, StandardCharsets.UTF_8);
    }

    /** 예약완료 사진 스트리밍용 값 객체. */
    public record BookingPhoto(byte[] data, String contentType) {
    }
}
