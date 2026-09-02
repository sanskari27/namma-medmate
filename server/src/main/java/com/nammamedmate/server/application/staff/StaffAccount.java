package com.nammamedmate.server.application.staff;

import com.nammamedmate.server.domain.AppUserRole;
import com.nammamedmate.server.domain.StaffRegistrationKind;
import com.nammamedmate.server.domain.UserAccountStatus;
import java.time.Instant;
import java.util.UUID;

public record StaffAccount(
    UUID id,
    String email,
    String displayName,
    String phone,
    AppUserRole role,
    UserAccountStatus status,
    StaffRegistrationKind kind,
    String licenseNumber,
    UUID registrationId,
    UUID createdBy,
    boolean mustChangePassword,
    Instant createdAt) {}
