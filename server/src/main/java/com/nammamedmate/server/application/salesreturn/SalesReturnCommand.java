package com.nammamedmate.server.application.salesreturn;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

public record SalesReturnCommand(
    UUID salesInvoiceId,
    String reason,
    String decision,
    String refundMode,
    String idempotencyKey,
    List<Line> lines) {

  public record Line(UUID salesInvoiceLineId, BigDecimal quantity) {}
}
