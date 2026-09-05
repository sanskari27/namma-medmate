package com.nammamedmate.server.application.purchaseorder;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

public record QualityCheckCommand(
    String idempotencyKey, Boolean visualInspectionPassed, Checklist checklist, List<Line> lines) {

  public record Checklist(
      Boolean packagingIntact, Boolean labelMatches, Boolean batchReadable, Boolean noDamage) {}

  public record Line(
      UUID goodsReceiptLineId,
      BigDecimal acceptedQuantity,
      BigDecimal rejectedQuantity,
      String batchNumber,
      LocalDate manufacturedOn,
      LocalDate expiresOn) {}
}
