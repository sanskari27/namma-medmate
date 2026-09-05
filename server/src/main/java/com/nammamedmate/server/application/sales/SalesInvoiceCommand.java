package com.nammamedmate.server.application.sales;

import com.nammamedmate.server.domain.ProductUnit;
import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

public record SalesInvoiceCommand(
    UUID customerId,
    UUID doctorId,
    String prescriptionReference,
    boolean prescriptionVerified,
    String idempotencyKey,
    Integer expectedVersion,
    List<Line> lines) {

  public record Line(
      UUID productId,
      UUID batchId,
      BigDecimal quantity,
      ProductUnit unit,
      Long mrpPaise,
      Long sellingPricePaise,
      Long discountPaise,
      BigDecimal prescribedQuantity) {}
}
