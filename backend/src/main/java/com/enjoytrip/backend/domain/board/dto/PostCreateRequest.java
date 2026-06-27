package com.enjoytrip.backend.domain.board.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record PostCreateRequest(
        @NotBlank @Size(max = 200) String title,
        @NotBlank String content,
        boolean isNotice
) {}
