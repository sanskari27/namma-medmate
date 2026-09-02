package com.nammamedmate.server.feature.auth;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import java.util.UUID;

public record PinLoginRequest(
    @NotNull UUID userId, @NotBlank @Pattern(regexp = "^[0-9]{6}$") String pin) {}
