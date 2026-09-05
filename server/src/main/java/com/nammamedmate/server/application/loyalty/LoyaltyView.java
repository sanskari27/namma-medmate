package com.nammamedmate.server.application.loyalty;

import com.nammamedmate.server.domain.LoyaltyLedgerType;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record LoyaltyView(
    UUID customerId, long balancePoints, long version, List<LedgerItem> entries) {

  public record LedgerItem(
      UUID id,
      LoyaltyLedgerType type,
      long points,
      long deltaPoints,
      long balanceAfterPoints,
      UUID invoiceId,
      UUID salesReturnId,
      long taxablePaise,
      String reason,
      Instant occurredAt) {}
}
