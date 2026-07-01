package com.enjoytrip.backend.domain.shopping.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record ShoppingItemUpdateRequest(
    @NotBlank @Size(max = 100) String name,
    @Size(max = 50) String quantity
) {}
