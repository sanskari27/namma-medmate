package com.nammamedmate.server.application.purchasereturn;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

public record PurchaseReturnCommand(
    UUID goodsReceiptId, String idempotencyKey, Long expectedAccountVersion, List<Line> lines) {

  public record Line(UUID goodsReceiptLineId, BigDecimal quantity) {}
}
