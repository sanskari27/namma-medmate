package com.nammamedmate.server.application.finance;

import com.nammamedmate.server.domain.ExpensePaymentMode;
import java.time.LocalDate;
import java.util.UUID;

public record ExpenseCommand(
    UUID categoryId,
    Long amountPaise,
    LocalDate occurredOn,
    String notes,
    String partyName,
    ExpensePaymentMode paymentMode,
    Integer gstPercent,
    UUID branchId,
    String idempotencyKey,
    Integer expectedVersion) {}
