package com.nammamedmate.server.feature.auth;

import jakarta.validation.constraints.NotBlank;

public record CompletePasswordResetRequest(@NotBlank String token, @NotBlank String password) {}
