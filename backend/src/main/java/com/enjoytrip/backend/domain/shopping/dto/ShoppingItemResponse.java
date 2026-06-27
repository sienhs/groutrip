package com.enjoytrip.backend.domain.shopping.dto;

import java.time.LocalDateTime;

import com.enjoytrip.backend.domain.shopping.entity.ShoppingItem;

public record ShoppingItemResponse(
    Long id,
    Long addedById,
    String addedByName,
    String name,
    String quantity,
    boolean checked,
    LocalDateTime createdAt
) {
    public static ShoppingItemResponse from(ShoppingItem item) {
        return new ShoppingItemResponse(
            item.getId(),
            item.getAddedBy().getId(),
            item.getAddedBy().getName(),
            item.getName(),
            item.getQuantity(),
            item.isChecked(),
            item.getCreatedAt()
        );
    }
}
