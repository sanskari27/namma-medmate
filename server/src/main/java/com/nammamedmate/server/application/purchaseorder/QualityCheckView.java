package com.nammamedmate.server.application.purchaseorder;

import com.nammamedmate.server.domain.GoodsReceiptStatus;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

public record QualityCheckView(
    UUID id,
    String receiptNumber,
    String receiptReference,
    GoodsReceiptStatus status,
    String supplierLegalName,
    Instant createdAt,
    Instant checkedAt,
    UUID checkedByUserId,
    Boolean visualInspectionPassed,
    ChecklistView checklist,
    List<LineView> lines) {

  public record ChecklistView(
      Boolean packagingIntact, Boolean labelMatches, Boolean batchReadable, Boolean noDamage) {}

  public record LineView(
      UUID id,
      UUID purchaseOrderLineId,
      UUID productId,
      String productName,
      String sku,
      BigDecimal quantity,
      long unitRatePaise,
      boolean requiresBatchTracking,
      BigDecimal acceptedQuantity,
      BigDecimal rejectedQuantity,
      String batchNumber,
      LocalDate manufacturedOn,
      LocalDate expiresOn,
      UUID stockMovementId) {}
}
