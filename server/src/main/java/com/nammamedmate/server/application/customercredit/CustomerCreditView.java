package com.nammamedmate.server.application.customercredit;

import com.nammamedmate.server.domain.CustomerCreditLedgerType;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record CustomerCreditView(
    UUID customerId,
    long limitPaise,
    long balancePaise,
    long availablePaise,
    long version,
    List<LedgerItem> entries) {

  public record LedgerItem(
      UUID id,
      CustomerCreditLedgerType type,
      long amountPaise,
      long balanceAfterPaise,
      UUID invoiceId,
      String settlementMode,
      String settlementReference,
      Instant occurredAt) {}
}
