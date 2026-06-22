package com.enjoytrip.backend.domain.schedule.repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import com.enjoytrip.backend.domain.schedule.entity.Schedule;

public interface ScheduleRepository extends JpaRepository<Schedule, Long> {

    // FR-SCHEDULE: 그룹 전체 일정을 일자→순서로 정렬해 조회한다.
    @EntityGraph(attributePaths = {"place", "createdBy", "updatedBy"})
    List<Schedule> findByTravelGroupIdOrderByScheduleDateAscOrderIndexAsc(Long groupId);

    // 일자별 일정 조회(목록 필터 및 새 항목 순서 계산용).
    @EntityGraph(attributePaths = {"place", "createdBy", "updatedBy"})
    List<Schedule> findByTravelGroupIdAndScheduleDateOrderByOrderIndexAsc(Long groupId, LocalDate scheduleDate);

    // FR-SCHEDULE-02/03: 수정/삭제/이동 대상 일정을 그룹 범위로 조회한다.
    @EntityGraph(attributePaths = {"place", "createdBy", "updatedBy"})
    Optional<Schedule> findByIdAndTravelGroupId(Long id, Long groupId);
}
