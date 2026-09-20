package com.nammamedmate.server.application.hospital;

import com.nammamedmate.server.domain.HospitalIndentStatus;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record HospitalIndentView(
    UUID id,
    String indentNumber,
    UUID wardId,
    String wardName,
    UUID bedId,
    String bedLabel,
    String patientName,
    String note,
    String requestedBy,
    Instant requestedAt,
    HospitalIndentStatus status,
    String hospitalInvoiceRef,
    Instant issuedAt,
    long version,
    List<LineView> lines) {

  public record LineView(
      UUID id,
      UUID productId,
      String productName,
      String sku,
      BigDecimal requestedQty,
      BigDecimal issuedQty) {}
}
