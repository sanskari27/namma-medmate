package com.nammamedmate.server.application.sales;

import com.nammamedmate.server.domain.PaymentMode;
import com.nammamedmate.server.domain.ProductUnit;
import com.nammamedmate.server.domain.ScheduleClassification;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;

public record InvoicePdfDocument(
    String pharmacyLegalName,
    String pharmacyAddress,
    String pharmacyPhone,
    String pharmacyGstin,
    String pharmacyPan,
    String pharmacyDrugLicenseNumber,
    String pharmacyDrugLicenseType,
    String invoiceNumber,
    Instant invoiceAt,
    String customerName,
    String customerAddress,
    String customerGstin,
    String doctorName,
    String doctorRegistration,
    String prescriptionReference,
    String pharmacistName,
    String pharmacistRegistration,
    List<Line> lines,
    long taxablePaise,
    long taxPaise,
    long totalPaise,
    long cgstPaise,
    long sgstPaise,
    long igstPaise,
    List<Payment> payments,
    List<ReturnNote> returns) {

  public record Line(
      String productName,
      String batchNumber,
      LocalDate expiresOn,
      BigDecimal quantity,
      ProductUnit unit,
      long mrpPaise,
      long sellingPricePaise,
      long discountPaise,
      String hsnCode,
      BigDecimal gstRate,
      long cgstPaise,
      long sgstPaise,
      long igstPaise,
      ScheduleClassification scheduleClassification,
      boolean controlledSubstance) {}

  public record Payment(PaymentMode mode, long amountPaise) {}

  public record ReturnNote(String reason, long refundTotalPaise) {}
}
