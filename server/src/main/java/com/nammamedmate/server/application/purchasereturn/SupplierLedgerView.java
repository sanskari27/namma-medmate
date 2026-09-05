package com.nammamedmate.server.application.purchasereturn;

import com.nammamedmate.server.domain.SupplierLedgerType;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

public record SupplierLedgerView(
    UUID supplierId,
    String supplierLegalName,
    long balancePaise,
    long version,
    List<EntryView> entries) {

  public record EntryView(
      UUID id,
      SupplierLedgerType type,
      long amountPaise,
      long balanceAfterPaise,
      UUID goodsReceiptId,
      UUID purchaseReturnId,
      String paymentMode,
      String paymentReference,
      LocalDate dueOn,
      Instant occurredAt) {}
}
