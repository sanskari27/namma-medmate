package com.nammamedmate.server.application.purchasereturn;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record PurchaseReturnListResult(List<Summary> items) {

  public record Summary(
      UUID id,
      String debitNoteNumber,
      String origin,
      String status,
      UUID supplierId,
      String supplierLegalName,
      long amountPaise,
      Instant createdAt) {}
}
