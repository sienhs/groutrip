package com.enjoytrip.backend.domain.group.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import com.enjoytrip.backend.domain.group.entity.GroupMember;

public interface GroupMemberRepository extends JpaRepository<GroupMember, Long> {

    // 특정 사용자가 현재 특정 그룹의 활성 멤버인지 확인한다.
    boolean existsByTravelGroupIdAndUserIdAndLeftAtIsNull(Long groupId, Long userId);

    // 그룹 정원 제한(FR-GROUP-03)을 검증하기 위해 현재 활성 멤버 수를 센다.
    long countByTravelGroupIdAndLeftAtIsNull(Long groupId);

    // 그룹 권한 AOP와 서비스 검증에서 현재 활성 멤버 정보를 조회한다.
    @EntityGraph(attributePaths = {"travelGroup", "user"})
    Optional<GroupMember> findByTravelGroupIdAndUserIdAndLeftAtIsNull(Long groupId, Long userId);

    // FR-GROUP-03: 재참여 시 떠난 행 포함해 기존 멤버십을 조회한다(있으면 재활성화).
    Optional<GroupMember> findByTravelGroupIdAndUserId(Long groupId, Long userId);

    // 내 그룹 목록(FR-GROUP-02)을 만들기 위해 사용자의 활성 그룹 멤버십을 조회한다.
    @EntityGraph(attributePaths = {"travelGroup", "user"})
    List<GroupMember> findByUserIdAndLeftAtIsNull(Long userId);

    // FR-GROUP-05: 그룹 멤버 관리 화면에서 현재 활성 멤버 목록을 조회한다.
    @EntityGraph(attributePaths = {"travelGroup", "user"})
    List<GroupMember> findByTravelGroupIdAndLeftAtIsNull(Long groupId);

    // 그룹 해체 알림은 해체 과정에서 비활성화된 기존 멤버에게도 전달해야 한다.
    @EntityGraph(attributePaths = {"travelGroup", "user"})
    List<GroupMember> findByTravelGroupId(Long groupId);

    void deleteByTravelGroupId(Long groupId);
}
