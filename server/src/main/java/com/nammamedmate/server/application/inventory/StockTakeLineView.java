package com.nammamedmate.server.application.inventory;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

public record StockTakeLineView(
    UUID id,
    UUID productId,
    String productSku,
    String productName,
    UUID batchId,
    String batchNumber,
    LocalDate expiresOn,
    BigDecimal expectedQuantity,
    BigDecimal countedQuantity,
    Instant countedAt,
    UUID countedByUserId,
    UUID adjustmentId,
    BigDecimal varianceQuantity,
    String direction) {}
