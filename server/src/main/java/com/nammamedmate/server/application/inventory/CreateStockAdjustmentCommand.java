package com.nammamedmate.server.application.inventory;

import java.math.BigDecimal;
import java.util.UUID;

public record CreateStockAdjustmentCommand(
    UUID productId,
    UUID batchId,
    String reason,
    BigDecimal quantity,
    String direction,
    String idempotencyKey) {}
