package com.nammamedmate.server.application.customerfamily;

import com.nammamedmate.server.domain.CustomerCreditLedgerType;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record FamilyCreditView(
    UUID familyId,
    long totalLimitPaise,
    long totalBalancePaise,
    long totalAvailablePaise,
    List<MemberCredit> members,
    List<LedgerItem> entries) {

  public record MemberCredit(
      UUID customerId,
      String customerName,
      String customerPhone,
      long limitPaise,
      long balancePaise,
      long availablePaise,
      long version) {}

  public record LedgerItem(
      UUID id,
      UUID customerId,
      String customerName,
      CustomerCreditLedgerType type,
      long amountPaise,
      long balanceAfterPaise,
      UUID invoiceId,
      String settlementMode,
      String settlementReference,
      Instant occurredAt) {}
}
