package com.nammamedmate.server.application.salesreturn;

import com.nammamedmate.server.domain.SalesReturnDecision;
import com.nammamedmate.server.domain.SalesReturnRefundMode;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record SalesReturnListResult(List<Summary> items) {

  public record Summary(
      UUID id,
      UUID salesInvoiceId,
      String invoiceNumber,
      UUID customerId,
      String customerName,
      String customerPhone,
      String reason,
      SalesReturnDecision decision,
      SalesReturnRefundMode refundMode,
      long refundTotalPaise,
      long cashRefundPaise,
      long creditNotePaise,
      int itemUnitCount,
      int lineCount,
      String itemSummary,
      Instant createdAt,
      List<LineSummary> lines) {}

  public record LineSummary(
      UUID id,
      UUID salesInvoiceLineId,
      String productName,
      String sku,
      String batchNumber,
      BigDecimal quantity,
      long refundAmountPaise) {}
}
