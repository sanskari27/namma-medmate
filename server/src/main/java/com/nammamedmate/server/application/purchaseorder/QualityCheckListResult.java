package com.nammamedmate.server.application.purchaseorder;

import com.nammamedmate.server.domain.GoodsReceiptStatus;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record QualityCheckListResult(List<Summary> items) {

  public record Summary(
      UUID id,
      String receiptNumber,
      String receiptReference,
      GoodsReceiptStatus status,
      String supplierLegalName,
      Instant createdAt,
      Instant checkedAt) {}
}
