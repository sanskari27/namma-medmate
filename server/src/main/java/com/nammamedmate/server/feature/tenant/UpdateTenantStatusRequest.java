package com.nammamedmate.server.feature.tenant;

import com.nammamedmate.server.domain.TenantStatus;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record UpdateTenantStatusRequest(
    @NotNull TenantStatus status, @NotBlank String reason, @NotNull TenantStatus expectedStatus) {}
