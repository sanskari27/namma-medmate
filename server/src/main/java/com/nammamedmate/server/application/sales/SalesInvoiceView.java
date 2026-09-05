package com.nammamedmate.server.application.sales;

import com.nammamedmate.server.domain.ProductUnit;
import com.nammamedmate.server.domain.SalesInvoiceStatus;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

public record SalesInvoiceView(
    UUID id,
    UUID tenantId,
    UUID branchId,
    String invoiceNumber,
    SalesInvoiceStatus status,
    UUID staffUserId,
    UUID terminalId,
    UUID customerId,
    UUID doctorId,
    String prescriptionReference,
    boolean prescriptionVerified,
    int version,
    long subtotalPaise,
    long discountPaise,
    long taxPaise,
    long totalPaise,
    List<LineView> lines,
    Instant createdAt,
    Instant updatedAt) {

  public record LineView(
      UUID id,
      UUID productId,
      String productName,
      String sku,
      UUID batchId,
      String batchNumber,
      LocalDate expiresOn,
      BigDecimal quantity,
      ProductUnit unit,
      BigDecimal baseQuantity,
      long mrpPaise,
      long sellingPricePaise,
      long discountPaise,
      String hsnCode,
      BigDecimal gstRate,
      long cgstPaise,
      long sgstPaise,
      long igstPaise,
      long lineTaxablePaise,
      long lineTaxPaise,
      long lineTotalPaise) {}
}
