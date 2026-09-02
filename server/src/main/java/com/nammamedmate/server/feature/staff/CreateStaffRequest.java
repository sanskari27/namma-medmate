package com.nammamedmate.server.feature.staff;

import com.nammamedmate.server.domain.AppUserRole;
import com.nammamedmate.server.domain.StaffRegistrationKind;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record CreateStaffRequest(
    @NotBlank String displayName,
    @NotBlank String phone,
    @NotBlank String email,
    @NotBlank String password,
    @NotNull AppUserRole role,
    @NotNull StaffRegistrationKind kind,
    String licenseNumber) {}
