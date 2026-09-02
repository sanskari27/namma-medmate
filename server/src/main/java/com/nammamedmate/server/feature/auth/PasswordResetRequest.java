package com.nammamedmate.server.feature.auth;

import jakarta.validation.constraints.NotBlank;

public record PasswordResetRequest(@NotBlank String email) {}
