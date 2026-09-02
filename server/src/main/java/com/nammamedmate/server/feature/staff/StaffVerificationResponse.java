package com.nammamedmate.server.feature.staff;

import com.nammamedmate.server.domain.StaffRegistrationKind;
import com.nammamedmate.server.domain.StaffRegistrationStatus;
import java.time.Instant;
import java.util.UUID;

public record StaffVerificationResponse(
    UUID id,
    UUID userId,
    UUID tenantId,
    String email,
    String displayName,
    StaffRegistrationKind kind,
    String licenseNumber,
    String evidenceReference,
    StaffRegistrationStatus status,
    UUID reviewedBy,
    Instant reviewedAt,
    Instant createdAt) {}
