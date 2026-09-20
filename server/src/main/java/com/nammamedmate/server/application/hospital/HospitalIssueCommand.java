package com.nammamedmate.server.application.hospital;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

public record HospitalIssueCommand(
    UUID wardId,
    UUID indentId,
    String reason,
    String uhid,
    String patientName,
    String idempotencyKey,
    List<Line> lines) {

  public record Line(UUID productId, UUID batchId, BigDecimal quantity) {}
}
