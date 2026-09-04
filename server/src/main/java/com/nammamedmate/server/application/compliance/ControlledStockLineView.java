package com.nammamedmate.server.application.compliance;

import com.nammamedmate.server.domain.ScheduleClassification;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

public record ControlledStockLineView(
    UUID id,
    UUID stockMovementId,
    UUID productId,
    String productName,
    String sku,
    ScheduleClassification scheduleClassification,
    UUID batchId,
    String batchNumber,
    LocalDate expiresOn,
    BigDecimal quantity,
    BigDecimal balanceAfter,
    String movementType,
    UUID createdByUserId,
    Instant occurredAt) {}
