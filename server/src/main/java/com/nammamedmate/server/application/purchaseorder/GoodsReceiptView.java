package com.nammamedmate.server.application.purchaseorder;

import com.nammamedmate.server.domain.GoodsReceiptStatus;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record GoodsReceiptView(
    UUID id,
    String receiptNumber,
    String receiptReference,
    GoodsReceiptStatus status,
    Instant createdAt,
    List<LineView> lines) {

  public record LineView(
      UUID purchaseOrderLineId,
      UUID productId,
      String productName,
      String sku,
      BigDecimal quantity,
      long unitRatePaise) {}
}
