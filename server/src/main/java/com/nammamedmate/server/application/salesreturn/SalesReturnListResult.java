package com.nammamedmate.server.application.salesreturn;

import com.nammamedmate.server.domain.SalesReturnDecision;
import com.nammamedmate.server.domain.SalesReturnRefundMode;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record SalesReturnListResult(List<Summary> items) {

  public record Summary(
      UUID id,
      UUID salesInvoiceId,
      String invoiceNumber,
      UUID customerId,
      String reason,
      SalesReturnDecision decision,
      SalesReturnRefundMode refundMode,
      long refundTotalPaise,
      Instant createdAt) {}
}
