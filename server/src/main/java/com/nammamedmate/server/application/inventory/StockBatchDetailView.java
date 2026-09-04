package com.nammamedmate.server.application.inventory;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

public record StockBatchDetailView(
    UUID batchId,
    UUID productId,
    String batchNumber,
    LocalDate manufacturedOn,
    LocalDate expiresOn,
    long purchasePricePaise,
    BigDecimal quantity,
    long version,
    UUID balanceId,
    boolean suggestedFefo,
    boolean nearExpiry,
    boolean expired) {}
