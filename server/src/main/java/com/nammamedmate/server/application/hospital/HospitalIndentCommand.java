package com.nammamedmate.server.application.hospital;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

public record HospitalIndentCommand(
    UUID wardId,
    UUID bedId,
    String patientName,
    String note,
    String requestedBy,
    List<Line> lines) {

  public record Line(UUID productId, BigDecimal requestedQty) {}
}
