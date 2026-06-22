package com.enjoytrip.backend.domain.group.repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.enjoytrip.backend.domain.group.entity.TravelGroup;

public interface TravelGroupRepository extends JpaRepository<TravelGroup, Long> {

    // 초대코드 생성/재발급 시 중복 여부를 확인한다.
    boolean existsByInviteCode(String inviteCode);

    // FR-GROUP-03: 유효한 초대코드로 삭제되지 않은 그룹을 찾는다.
    Optional<TravelGroup> findByInviteCodeAndDeletedAtIsNull(String inviteCode);

    // Owner 전용 그룹 관리 기능에서 삭제되지 않은 그룹만 대상으로 조회한다.
    Optional<TravelGroup> findByIdAndDeletedAtIsNull(Long id);

    // 그룹 상태 배치에서 삭제되지 않은 그룹만 대상으로 삼는다.
    List<TravelGroup> findByDeletedAtIsNull();

    // FR-GROUP-06: soft delete 후 보존 기간이 지난 그룹을 hard delete 배치 대상으로 조회한다.
    List<TravelGroup> findByDeletedAtLessThanEqual(LocalDateTime threshold);
}
