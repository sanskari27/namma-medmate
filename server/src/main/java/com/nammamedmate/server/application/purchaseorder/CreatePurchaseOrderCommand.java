package com.nammamedmate.server.application.purchaseorder;

import com.nammamedmate.server.domain.SupplierPaymentTerms;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

public record CreatePurchaseOrderCommand(
    UUID supplierId,
    LocalDate expectedDeliveryDate,
    SupplierPaymentTerms paymentTerms,
    String notes,
    String idempotencyKey,
    List<Line> lines) {

  public record Line(UUID productId, BigDecimal quantity, Long unitRatePaise) {}
}
