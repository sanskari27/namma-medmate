package com.nammamedmate.server.application.hospital;

import com.nammamedmate.server.domain.HospitalCreditTerms;
import com.nammamedmate.server.domain.HospitalIssueReason;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

public record HospitalIssueView(
    UUID id,
    String invoiceNumber,
    UUID wardId,
    String wardName,
    UUID indentId,
    String indentNumber,
    HospitalIssueReason reason,
    String uhid,
    String patientName,
    String pharmacyGstin,
    String hospitalGstin,
    HospitalCreditTerms creditTerms,
    long mrpValuePaise,
    long billedPaise,
    Instant issuedAt,
    long version,
    List<LineView> lines) {

  public record LineView(
      UUID id,
      UUID productId,
      String productName,
      String sku,
      UUID batchId,
      String batchNumber,
      LocalDate expiryOn,
      String hsnCode,
      BigDecimal gstRate,
      BigDecimal quantity,
      long mrpPaise,
      long creditPricePaise,
      int discountBps,
      long amountPaise) {}
}
