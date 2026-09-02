package com.nammamedmate.server.feature.auth;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

public record PinRequest(@NotBlank @Pattern(regexp = "^[0-9]{6}$") String pin) {}
