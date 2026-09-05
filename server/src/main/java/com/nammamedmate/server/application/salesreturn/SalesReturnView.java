package com.nammamedmate.server.application.salesreturn;

import com.nammamedmate.server.domain.SalesReturnDecision;
import com.nammamedmate.server.domain.SalesReturnRefundMode;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record SalesReturnView(
    UUID id,
    UUID salesInvoiceId,
    String invoiceNumber,
    UUID customerId,
    String reason,
    SalesReturnDecision decision,
    SalesReturnRefundMode refundMode,
    long refundTotalPaise,
    long cashRefundPaise,
    long creditNotePaise,
    Instant createdAt,
    List<LineView> lines) {

  public record LineView(
      UUID id,
      UUID salesInvoiceLineId,
      UUID productId,
      String productName,
      String sku,
      UUID batchId,
      String batchNumber,
      BigDecimal quantity,
      long lineTotalPaise,
      long refundAmountPaise,
      UUID stockMovementId) {}
}
