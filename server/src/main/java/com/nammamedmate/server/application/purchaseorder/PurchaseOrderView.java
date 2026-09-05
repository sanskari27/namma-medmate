package com.nammamedmate.server.application.purchaseorder;

import com.nammamedmate.server.domain.PurchaseOrderStatus;
import com.nammamedmate.server.domain.SupplierPaymentTerms;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

public record PurchaseOrderView(
    UUID id,
    UUID tenantId,
    UUID branchId,
    UUID supplierId,
    String supplierLegalName,
    String poNumber,
    PurchaseOrderStatus status,
    LocalDate expectedDeliveryDate,
    SupplierPaymentTerms paymentTerms,
    String notes,
    int version,
    long subtotalPaise,
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
      BigDecimal quantity,
      long unitRatePaise,
      BigDecimal gstRate,
      long lineSubtotalPaise,
      long lineTaxPaise,
      long lineTotalPaise) {}
}
