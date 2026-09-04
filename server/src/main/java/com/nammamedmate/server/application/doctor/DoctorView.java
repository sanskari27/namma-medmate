package com.nammamedmate.server.application.doctor;

import java.time.Instant;
import java.util.UUID;

public record DoctorView(
    UUID id,
    UUID tenantId,
    String name,
    String registrationNumber,
    String phone,
    String notes,
    Instant createdAt,
    Instant updatedAt) {}
