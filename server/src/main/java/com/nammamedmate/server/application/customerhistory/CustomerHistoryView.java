package com.nammamedmate.server.application.customerhistory;

import com.nammamedmate.server.domain.CustomerHistoryFactType;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record CustomerHistoryView(List<HistoryItem> items) {

  public record HistoryItem(
      UUID id,
      UUID customerId,
      CustomerHistoryFactType type,
      String summary,
      String prescriptionReference,
      UUID doctorId,
      String doctorName,
      UUID invoiceId,
      Long amountPaise,
      Instant occurredAt) {}
}
