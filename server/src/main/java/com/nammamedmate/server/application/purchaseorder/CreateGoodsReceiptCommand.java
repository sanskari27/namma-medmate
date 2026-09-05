package com.nammamedmate.server.application.purchaseorder;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

public record CreateGoodsReceiptCommand(
    String receiptReference, String idempotencyKey, List<Line> lines) {

  public record Line(UUID purchaseOrderLineId, BigDecimal quantity, Long unitRatePaise) {}
}
