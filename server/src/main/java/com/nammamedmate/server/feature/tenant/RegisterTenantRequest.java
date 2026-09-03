package com.nammamedmate.server.feature.tenant;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record RegisterTenantRequest(
    @NotBlank @Size(max = 255) String businessName,
    @NotBlank @Size(max = 255) String email,
    @NotBlank @Size(max = 32) String phone,
    @NotBlank @Size(min = 8, max = 128) String password) {}
