package com.enjoytrip.backend.domain.gallery.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import com.enjoytrip.backend.domain.gallery.entity.GroupPhoto;

public interface GroupPhotoRepository extends JpaRepository<GroupPhoto, Long> {

    @EntityGraph(attributePaths = "uploadedBy")
    List<GroupPhoto> findByTravelGroupIdOrderByCreatedAtDesc(Long groupId);

    long countByTravelGroupId(Long groupId);

    Optional<GroupPhoto> findByIdAndTravelGroupId(Long id, Long groupId);
}
