package com.nammamedmate.server.application.inventory;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

public record StockBalanceView(
    UUID balanceId,
    UUID productId,
    String productSku,
    String productName,
    UUID batchId,
    String batchNumber,
    LocalDate manufacturedOn,
    LocalDate expiresOn,
    Long purchasePricePaise,
    BigDecimal quantity,
    long version,
    boolean nearExpiry) {}
