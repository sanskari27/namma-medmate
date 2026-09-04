package com.nammamedmate.server.application.inventory;

import com.nammamedmate.server.domain.StockAdjustmentDirection;
import com.nammamedmate.server.domain.StockAdjustmentReason;
import com.nammamedmate.server.domain.StockAdjustmentStatus;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

public record StockAdjustmentView(
    UUID id,
    UUID productId,
    String productSku,
    String productName,
    UUID batchId,
    String batchNumber,
    StockAdjustmentReason reason,
    BigDecimal quantity,
    StockAdjustmentDirection direction,
    StockAdjustmentStatus status,
    UUID requesterUserId,
    UUID approverUserId,
    UUID approvalRequestId,
    int version,
    Instant createdAt,
    Instant decidedAt) {}
