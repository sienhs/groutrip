package com.enjoytrip.backend.domain.settlement.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import com.enjoytrip.backend.domain.settlement.entity.Settlement;

public interface SettlementRepository extends JpaRepository<Settlement, Long> {

    boolean existsByTravelGroupId(Long groupId);

    @EntityGraph(attributePaths = {"travelGroup", "fromUser", "toUser"})
    List<Settlement> findByTravelGroupIdOrderByIdAsc(Long groupId);

    @EntityGraph(attributePaths = {"travelGroup", "fromUser", "toUser"})
    Optional<Settlement> findByIdAndTravelGroupId(Long id, Long groupId);
}
