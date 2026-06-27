package com.enjoytrip.backend.domain.shopping.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.enjoytrip.backend.domain.shopping.entity.ShoppingItem;

public interface ShoppingItemRepository extends JpaRepository<ShoppingItem, Long> {

    List<ShoppingItem> findByGroupIdOrderByCreatedAtAsc(Long groupId);

    Optional<ShoppingItem> findByIdAndGroupId(Long id, Long groupId);
}
