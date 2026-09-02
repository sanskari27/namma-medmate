package com.nammamedmate.server.feature.impersonation;

import jakarta.validation.constraints.NotBlank;

public record StartImpersonationRequest(@NotBlank String email) {}
