package com.nammamedmate.server.application.sales;

import com.nammamedmate.server.domain.DiscountApprovalStatus;
import com.nammamedmate.server.domain.DiscountType;
import com.nammamedmate.server.domain.EinvoiceApplicability;
import com.nammamedmate.server.domain.EinvoiceStatus;
import com.nammamedmate.server.domain.GstRateSource;
import com.nammamedmate.server.domain.OfferKind;
import com.nammamedmate.server.domain.PaymentMode;
import com.nammamedmate.server.domain.ProductUnit;
import com.nammamedmate.server.domain.SalesInvoiceStatus;
import com.nammamedmate.server.domain.ScheduleClassification;
import com.nammamedmate.server.domain.TaxJurisdiction;
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
    DiscountType billDiscountType,
    long billDiscountValue,
    String customerGstin,
    TaxJurisdiction taxJurisdiction,
    long cgstPaise,
    long sgstPaise,
    long igstPaise,
    long roundOffPaise,
    UUID discountApprovalRequestId,
    DiscountApprovalStatus discountApprovalStatus,
    String taxAdjustmentReason,
    boolean taxAdjusted,
    long amountPaidPaise,
    long amountDuePaise,
    long changePaise,
    long loyaltyRedeemPoints,
    long loyaltyRedeemPaise,
    long loyaltyEarnedPoints,
    long loyaltyTaxablePaise,
    long loyaltyPendingTaxablePaise,
    EinvoiceApplicability einvoiceApplicability,
    EinvoiceStatus einvoiceStatus,
    String einvoiceIrn,
    Instant completedAt,
    List<PaymentView> payments,
    List<LineView> lines,
    Instant createdAt,
    Instant updatedAt,
    InvoiceRevalidation revalidation) {

  public record PaymentView(PaymentMode mode, long amountPaise, String reference) {}

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
      DiscountType discountType,
      long discountValue,
      long billDiscountPaise,
      String hsnCode,
      String taxCategory,
      BigDecimal gstRate,
      GstRateSource gstRateSource,
      BigDecimal originalGstRate,
      long cgstPaise,
      long sgstPaise,
      long igstPaise,
      long lineTaxablePaise,
      long lineTaxPaise,
      long lineTotalPaise,
      BigDecimal prescribedQuantity,
      UUID offerId,
      String offerName,
      OfferKind offerKind,
      Integer offerPriority,
      long offerBenefitPaise,
      String offerExplanation,
      ScheduleClassification scheduleClassification,
      boolean controlledSubstance) {}
}
