package com.nammamedmate.server.application.hospital;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;

public record HospitalWsInvoicePdfDocument(
    String invoiceNumber,
    Instant issuedAt,
    String pharmacyName,
    String pharmacyAddress,
    String pharmacyGstin,
    String pharmacyDrugLicense,
    String hospitalName,
    String hospitalGstin,
    String wardName,
    String reason,
    String indentRef,
    String uhid,
    String patientName,
    String creditTerms,
    long mrpValuePaise,
    long billedPaise,
    List<Line> lines) {

  public record Line(
      String productName,
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
