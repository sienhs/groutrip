package com.enjoytrip.backend.domain.chat.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record ChatSendRequest(
        @NotBlank @Size(max = 1000)
        String content
) {}
