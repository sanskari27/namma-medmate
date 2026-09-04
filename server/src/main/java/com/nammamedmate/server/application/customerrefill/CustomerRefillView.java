package com.nammamedmate.server.application.customerrefill;

import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

public record CustomerRefillView(
    UUID id,
    UUID customerId,
    String medicineName,
    int intervalDays,
    LocalDate nextDueOn,
    long version,
    Instant updatedAt) {}
