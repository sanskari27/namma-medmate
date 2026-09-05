package com.nammamedmate.server.application.finance;

import java.time.LocalDate;
import java.util.UUID;

public record ExpenseCommand(
    UUID categoryId,
    Long amountPaise,
    LocalDate occurredOn,
    String notes,
    UUID branchId,
    String idempotencyKey,
    Integer expectedVersion) {}
