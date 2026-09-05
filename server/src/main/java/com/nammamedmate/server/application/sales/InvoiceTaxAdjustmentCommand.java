package com.nammamedmate.server.application.sales;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

public record InvoiceTaxAdjustmentCommand(
    Integer expectedVersion, String reason, List<LineRate> lines) {

  public record LineRate(UUID productId, BigDecimal gstRate) {}
}
