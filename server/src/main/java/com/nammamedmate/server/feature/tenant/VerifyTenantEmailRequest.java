package com.nammamedmate.server.feature.tenant;

import jakarta.validation.constraints.NotBlank;

public record VerifyTenantEmailRequest(@NotBlank String token) {}
