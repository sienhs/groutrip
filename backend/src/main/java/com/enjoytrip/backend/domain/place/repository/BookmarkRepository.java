package com.enjoytrip.backend.domain.place.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import com.enjoytrip.backend.domain.place.entity.Bookmark;

public interface BookmarkRepository extends JpaRepository<Bookmark, Long> {

    // FR-PLACE-02: 같은 그룹에 동일 장소가 이미 보관되어 있는지 확인한다.
    boolean existsByTravelGroupIdAndPlaceId(Long groupId, Long placeId);

    // FR-PLACE-03: 그룹 보관함 목록. 장소/추가자를 함께 로딩해 N+1을 피한다.
    @EntityGraph(attributePaths = {"place", "createdBy"})
    List<Bookmark> findByTravelGroupId(Long groupId);

    // FR-PLACE-04: 수정/삭제 대상 보관함 항목을 그룹 범위로 조회한다.
    @EntityGraph(attributePaths = {"place", "createdBy"})
    Optional<Bookmark> findByIdAndTravelGroupId(Long id, Long groupId);
}
