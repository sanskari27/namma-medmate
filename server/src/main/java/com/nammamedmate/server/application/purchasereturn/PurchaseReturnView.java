package com.nammamedmate.server.application.purchasereturn;

import com.nammamedmate.server.domain.PurchaseReturnOrigin;
import com.nammamedmate.server.domain.PurchaseReturnStatus;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record PurchaseReturnView(
    UUID id,
    String debitNoteNumber,
    PurchaseReturnOrigin origin,
    PurchaseReturnStatus status,
    UUID supplierId,
    String supplierLegalName,
    UUID goodsReceiptId,
    long amountPaise,
    Instant createdAt,
    List<LineView> lines) {

  public record LineView(
      UUID id,
      UUID goodsReceiptLineId,
      UUID productId,
      String productName,
      String sku,
      UUID batchId,
      BigDecimal quantity,
      long unitRatePaise,
      long amountPaise,
      UUID stockMovementId) {}
}
