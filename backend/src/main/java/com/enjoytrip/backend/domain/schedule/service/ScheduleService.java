package com.enjoytrip.backend.domain.schedule.service;

import java.time.LocalDate;
import java.util.List;

import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.enjoytrip.backend.domain.auth.entity.User;
import com.enjoytrip.backend.domain.group.entity.TravelGroup;
import com.enjoytrip.backend.domain.group.repository.TravelGroupRepository;
import com.enjoytrip.backend.domain.group.service.CurrentUserResolver;
import com.enjoytrip.backend.domain.group.service.GroupAccessValidator;
import com.enjoytrip.backend.domain.place.controller.PlacePhotoController;
import com.enjoytrip.backend.domain.place.entity.Place;
import com.enjoytrip.backend.domain.place.repository.PlaceRepository;
import com.enjoytrip.backend.domain.expense.service.ExpenseService;
import com.enjoytrip.backend.domain.vote.service.VoteService;
import com.enjoytrip.backend.domain.schedule.dto.ScheduleCostRequest;
import com.enjoytrip.backend.domain.schedule.dto.ScheduleCreateRequest;
import com.enjoytrip.backend.domain.schedule.dto.ScheduleReorderRequest;
import com.enjoytrip.backend.domain.schedule.dto.ScheduleSetPlaceRequest;
import com.enjoytrip.backend.domain.schedule.dto.ScheduleResponse;
import com.enjoytrip.backend.domain.schedule.dto.ScheduleUpdateRequest;
import com.enjoytrip.backend.domain.schedule.entity.Schedule;
import com.enjoytrip.backend.domain.schedule.entity.ScheduleStatus;
import com.enjoytrip.backend.domain.schedule.repository.ScheduleRepository;
import com.enjoytrip.backend.global.event.DomainEvent;
import com.enjoytrip.backend.global.event.EventType;
import com.enjoytrip.backend.global.exception.BusinessException;
import com.enjoytrip.backend.global.exception.ErrorCode;

import lombok.RequiredArgsConstructor;

/**
 * FR-SCHEDULE-01~03/06: 일정 CRUD, 드래그 reorder, 상태 관리.
 * 협업 우선이라 모든 그룹 멤버가 일정을 추가/수정/삭제할 수 있다.
 */
@Service
@RequiredArgsConstructor
@Transactional
public class ScheduleService {

    private final ScheduleRepository scheduleRepository;
    private final PlaceRepository placeRepository;
    private final TravelGroupRepository travelGroupRepository;
    private final CurrentUserResolver currentUserResolver;
    private final GroupAccessValidator groupAccessValidator;
    private final ApplicationEventPublisher eventPublisher;
    private final ExpenseService expenseService;
    private final VoteService voteService;

    /**
     * FR-SCHEDULE-01: 일정 추가. 새 항목은 해당 일자의 마지막 순서로 배치한다.
     */
    public ScheduleResponse create(Long groupId, ScheduleCreateRequest request) {
        User user = currentUserResolver.getCurrentUser();
        groupAccessValidator.validateMember(groupId, user.getId());
        TravelGroup group = travelGroupRepository.findByIdAndDeletedAtIsNull(groupId)
                .orElseThrow(() -> new BusinessException(ErrorCode.GROUP_NOT_FOUND));

        validateWithinPeriod(group, request.scheduleDate());
        validateTimeRange(request.startTime(), request.endTime());

        // 빈 일정(투표로 정할 일정)은 placeId 없이 title로 만든다. 장소·제목 둘 다 없으면 거부.
        Place place = null;
        if (request.placeId() != null) {
            place = placeRepository.findById(request.placeId())
                    .orElseThrow(() -> new BusinessException(ErrorCode.PLACE_NOT_FOUND));
        } else if (request.title() == null || request.title().isBlank()) {
            throw new BusinessException(ErrorCode.INVALID_INPUT);
        }

        int nextOrderIndex = nextOrderIndex(groupId, request.scheduleDate());
        Schedule schedule = scheduleRepository.save(Schedule.builder()
                .travelGroup(group)
                .place(place)
                .title(request.title())
                .scheduleDate(request.scheduleDate())
                .orderIndex(nextOrderIndex)
                .startTime(request.startTime())
                .endTime(request.endTime())
                .memo(request.memo())
                .estimatedCost(request.estimatedCost())
                .transportMode(request.transportMode())
                .status(ScheduleStatus.PLANNED)
                .createdBy(user)
                .updatedBy(user)
                .build());

        ScheduleResponse response = toResponse(schedule);
        eventPublisher.publishEvent(DomainEvent.of(EventType.SCHEDULE_ADDED, groupId, user.getId(), response));
        return response;
    }

    /**
     * FR-SCHEDULE: 일정 조회. date가 주어지면 해당 일자만, 없으면 전체를 일자→순서로 반환한다.
     */
    @Transactional(readOnly = true)
    public List<ScheduleResponse> getSchedules(Long groupId, LocalDate date) {
        User user = currentUserResolver.getCurrentUser();
        groupAccessValidator.validateMember(groupId, user.getId());

        List<Schedule> schedules = (date == null)
                ? scheduleRepository.findByTravelGroupIdOrderByScheduleDateAscOrderIndexAsc(groupId)
                : scheduleRepository.findByTravelGroupIdAndScheduleDateOrderByOrderIndexAsc(groupId, date);
        return schedules.stream().map(this::toResponse).toList();
    }

    /**
     * FR-SCHEDULE-02: 일정 수정. 마지막 수정자를 기록한다.
     */
    public ScheduleResponse update(Long groupId, Long scheduleId, ScheduleUpdateRequest request) {
        User user = currentUserResolver.getCurrentUser();
        groupAccessValidator.validateMember(groupId, user.getId());
        Schedule schedule = findSchedule(groupId, scheduleId);

        validateTimeRange(request.startTime(), request.endTime());
        schedule.update(request.startTime(), request.endTime(), request.memo(), request.estimatedCost(),
                request.transportMode(), request.status(), user);

        ScheduleResponse response = toResponse(schedule);
        eventPublisher.publishEvent(DomainEvent.of(EventType.SCHEDULE_UPDATED, groupId, user.getId(), response));
        return response;
    }

    /**
     * 일정 예상 비용 설정 — 정산 연동 지출(균등 분담)로 등록/수정/제거하고 일정의 estimatedCost도 동기화한다.
     */
    public ScheduleResponse setEstimatedCost(Long groupId, Long scheduleId, ScheduleCostRequest request) {
        User user = currentUserResolver.getCurrentUser();
        groupAccessValidator.validateMember(groupId, user.getId());
        Schedule schedule = findSchedule(groupId, scheduleId);

        Long amount = request.estimatedCost();
        boolean hasCost = amount != null && amount > 0;
        schedule.updateEstimatedCost(hasCost ? amount : null, user);

        String name = schedule.getPlace() != null
                ? schedule.getPlace().getName()
                : (schedule.getTitle() != null && !schedule.getTitle().isBlank() ? schedule.getTitle() : "일정");
        expenseService.syncScheduleCostExpense(
                groupId, scheduleId, "[일정] " + name, schedule.getScheduleDate(),
                hasCost ? amount : null, request.payerId());

        ScheduleResponse response = toResponse(schedule);
        eventPublisher.publishEvent(DomainEvent.of(EventType.SCHEDULE_UPDATED, groupId, user.getId(), response));
        return response;
    }

    /**
     * FR-SCHEDULE-02: 일정 삭제.
     */
    public void delete(Long groupId, Long scheduleId) {
        User user = currentUserResolver.getCurrentUser();
        groupAccessValidator.validateMember(groupId, user.getId());
        Schedule schedule = findSchedule(groupId, scheduleId);

        // 일정에 연동된 예상 비용 지출도 함께 정리(고아 지출 방지).
        expenseService.syncScheduleCostExpense(groupId, scheduleId, null, null, null, null);
        // 일정에 연동된 투표 세션·후보·투표도 함께 정리(FK 위반 500 방지).
        voteService.deleteBySchedule(scheduleId);
        scheduleRepository.delete(schedule);
        eventPublisher.publishEvent(DomainEvent.of(EventType.SCHEDULE_DELETED, groupId, user.getId(), scheduleId));
    }

    /**
     * 빈 일정의 장소를 Owner가 투표 없이 직접 확정한다(권한은 컨트롤러 @RequiredGroupOwner + 서비스 재검증).
     */
    public ScheduleResponse setPlace(Long groupId, Long scheduleId, ScheduleSetPlaceRequest request) {
        User user = currentUserResolver.getCurrentUser();
        groupAccessValidator.validateOwner(groupId, user.getId());
        Schedule schedule = findSchedule(groupId, scheduleId);

        Place place = placeRepository.findById(request.placeId())
                .orElseThrow(() -> new BusinessException(ErrorCode.PLACE_NOT_FOUND));
        schedule.adoptPlace(place, user); // 장소 확정 + 상태 PLANNED

        ScheduleResponse response = toResponse(schedule);
        eventPublisher.publishEvent(DomainEvent.of(EventType.SCHEDULE_UPDATED, groupId, user.getId(), response));
        return response;
    }

    /**
     * FR-SCHEDULE-03: 드래그 reorder. 변경된 모든 일정의 (일자, 순서)를 한 번에 반영한다.
     */
    public List<ScheduleResponse> reorder(Long groupId, ScheduleReorderRequest request) {
        User user = currentUserResolver.getCurrentUser();
        groupAccessValidator.validateMember(groupId, user.getId());
        TravelGroup group = travelGroupRepository.findByIdAndDeletedAtIsNull(groupId)
                .orElseThrow(() -> new BusinessException(ErrorCode.GROUP_NOT_FOUND));

        List<ScheduleResponse> moved = request.items().stream()
                .map(item -> {
                    validateWithinPeriod(group, item.scheduleDate());
                    Schedule schedule = findSchedule(groupId, item.scheduleId());
                    schedule.moveTo(item.scheduleDate(), item.orderIndex(), user);
                    return toResponse(schedule);
                })
                .toList();

        eventPublisher.publishEvent(DomainEvent.of(EventType.SCHEDULE_REORDERED, groupId, user.getId(), moved));
        return moved;
    }

    private Schedule findSchedule(Long groupId, Long scheduleId) {
        return scheduleRepository.findByIdAndTravelGroupId(scheduleId, groupId)
                .orElseThrow(() -> new BusinessException(ErrorCode.SCHEDULE_NOT_FOUND));
    }

    // 새 일정은 해당 일자의 마지막 순서 다음에 배치한다.
    private int nextOrderIndex(Long groupId, LocalDate date) {
        List<Schedule> sameDay = scheduleRepository.findByTravelGroupIdAndScheduleDateOrderByOrderIndexAsc(groupId, date);
        return sameDay.isEmpty() ? 0 : sameDay.get(sameDay.size() - 1).getOrderIndex() + 1;
    }

    // FR-SCHEDULE: 일정 일자는 그룹 여행 기간 안이어야 한다.
    private void validateWithinPeriod(TravelGroup group, LocalDate date) {
        if (date.isBefore(group.getStartDate()) || date.isAfter(group.getEndDate())) {
            throw new BusinessException(ErrorCode.SCHEDULE_OUT_OF_PERIOD);
        }
    }

    // FR-SCHEDULE-01: 시작 시각은 종료 시각보다 늦을 수 없다.
    private void validateTimeRange(java.time.LocalTime start, java.time.LocalTime end) {
        if (!start.isBefore(end)) {
            throw new BusinessException(ErrorCode.SCHEDULE_TIME_INVALID);
        }
    }

    private ScheduleResponse toResponse(Schedule schedule) {
        // 빈 일정은 place가 null이라 사진도 없다.
        String photoName = schedule.getPlace() == null ? null : schedule.getPlace().getPhotoName();
        String photoUrl = photoName == null ? null : PlacePhotoController.proxyUrl(photoName);
        return ScheduleResponse.from(schedule, photoUrl);
    }
}
