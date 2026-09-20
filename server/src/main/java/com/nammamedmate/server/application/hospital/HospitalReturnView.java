package com.nammamedmate.server.application.hospital;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record HospitalReturnView(
    UUID id,
    UUID issueId,
    String invoiceNumber,
    UUID wardId,
    String wardName,
    long creditPaise,
    Instant occurredAt,
    List<Line> lines) {

  public record Line(
      UUID id, UUID productId, String productName, BigDecimal quantity, long amountPaise) {}
}
