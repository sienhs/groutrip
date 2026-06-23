package com.enjoytrip.backend.domain.auth.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

public record OAuthCodeExchangeRequest(
		@NotBlank
		@Pattern(regexp = "^[a-f0-9]{64}$")
		String code
) {
}
