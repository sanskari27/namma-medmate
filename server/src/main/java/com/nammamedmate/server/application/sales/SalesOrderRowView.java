package com.nammamedmate.server.application.sales;

import com.nammamedmate.server.domain.PaymentMode;
import com.nammamedmate.server.domain.SalesInvoiceStatus;
import com.nammamedmate.server.domain.SalesOrderChannel;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record SalesOrderRowView(
    UUID id,
    String invoiceNumber,
    SalesInvoiceStatus status,
    SalesOrderChannel channel,
    UUID customerId,
    String customerName,
    String customerPhone,
    String customerAddress,
    boolean hasPrescription,
    String prescriptionReference,
    boolean prescriptionVerified,
    boolean hasPrescriptionAttachment,
    String prescriptionAttachmentFilename,
    String prescriptionAttachmentContentType,
    int itemUnitCount,
    int lineCount,
    String itemSummary,
    String paymentLabel,
    long amountPaidPaise,
    long amountDuePaise,
    long subtotalPaise,
    long taxPaise,
    long totalPaise,
    Instant createdAt,
    Instant completedAt,
    Instant updatedAt,
    List<PaymentView> payments,
    List<LineView> lines) {

  public record PaymentView(PaymentMode mode, long amountPaise, String reference) {}

  public record LineView(
      UUID id,
      String productName,
      String batchNumber,
      BigDecimal quantity,
      long sellingPricePaise,
      long lineTotalPaise) {}
}
