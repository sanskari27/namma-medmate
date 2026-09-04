package com.nammamedmate.server.application.inventory;

import java.math.BigDecimal;
import java.util.UUID;

public record StockTransferLineView(
    UUID id,
    UUID productId,
    String productSku,
    String productName,
    UUID batchId,
    BigDecimal quantity) {}
