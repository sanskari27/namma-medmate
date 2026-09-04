package com.nammamedmate.server.application.inventory;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

public record StockMovementView(
    UUID id,
    UUID productId,
    UUID batchId,
    String type,
    BigDecimal quantity,
    BigDecimal balanceAfter,
    Long purchasePricePaise,
    Instant occurredAt) {}
