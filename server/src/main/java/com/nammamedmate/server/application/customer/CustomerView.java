package com.nammamedmate.server.application.customer;

import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

public record CustomerView(
    UUID id,
    UUID tenantId,
    String name,
    String phone,
    String email,
    LocalDate dateOfBirth,
    String gender,
    String address,
    String bloodGroup,
    String allergies,
    String chronicConditions,
    Instant createdAt,
    Instant updatedAt) {}
