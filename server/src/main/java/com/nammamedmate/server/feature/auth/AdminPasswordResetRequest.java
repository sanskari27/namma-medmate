package com.nammamedmate.server.feature.auth;

import jakarta.validation.constraints.NotBlank;

public record AdminPasswordResetRequest(@NotBlank String email, @NotBlank String password) {}
