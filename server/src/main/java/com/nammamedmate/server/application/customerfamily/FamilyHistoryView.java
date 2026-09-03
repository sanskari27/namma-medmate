package com.nammamedmate.server.application.customerfamily;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record FamilyHistoryView(List<HistoryItem> items) {

  public record HistoryItem(
      UUID id,
      UUID customerId,
      String customerName,
      String type,
      String summary,
      Instant occurredAt) {}
}
