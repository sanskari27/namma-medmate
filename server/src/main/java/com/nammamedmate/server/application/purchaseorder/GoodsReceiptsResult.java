package com.nammamedmate.server.application.purchaseorder;

import com.nammamedmate.server.domain.PurchaseOrderStatus;
import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

public record GoodsReceiptsResult(
    UUID purchaseOrderId,
    String poNumber,
    PurchaseOrderStatus status,
    UUID supplierId,
    String supplierLegalName,
    List<OutstandingLine> lines,
    List<GoodsReceiptView> receipts) {

  public record OutstandingLine(
      UUID purchaseOrderLineId,
      UUID productId,
      String productName,
      String sku,
      BigDecimal orderedQuantity,
      long unitRatePaise,
      BigDecimal receivedQuantity,
      BigDecimal remainingQuantity) {}
}
