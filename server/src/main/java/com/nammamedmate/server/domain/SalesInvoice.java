package com.nammamedmate.server.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;
import lombok.Getter;
import lombok.Setter;

@Entity
@Table(name = "sales_invoice")
@Getter
@Setter
public class SalesInvoice {

  @Id private UUID id;

  @Column(name = "tenant_id", nullable = false)
  private UUID tenantId;

  @Column(name = "branch_id", nullable = false)
  private UUID branchId;

  @Column(name = "invoice_number", nullable = false, length = 48)
  private String invoiceNumber;

  @Enumerated(EnumType.STRING)
  @Column(nullable = false, length = 16)
  private SalesInvoiceStatus status;

  @Column(name = "staff_user_id", nullable = false)
  private UUID staffUserId;

  @Column(name = "terminal_id", nullable = false)
  private UUID terminalId;

  @Column(name = "customer_id")
  private UUID customerId;

  @Column(name = "doctor_id")
  private UUID doctorId;

  @Column(name = "prescription_reference", length = 64)
  private String prescriptionReference;

  @Column(name = "prescription_verified", nullable = false)
  private boolean prescriptionVerified;

  @Column(name = "subtotal_paise", nullable = false)
  private long subtotalPaise;

  @Column(name = "discount_paise", nullable = false)
  private long discountPaise;

  @Column(name = "tax_paise", nullable = false)
  private long taxPaise;

  @Column(name = "total_paise", nullable = false)
  private long totalPaise;

  @Enumerated(EnumType.STRING)
  @Column(name = "bill_discount_type", nullable = false, length = 16)
  private DiscountType billDiscountType = DiscountType.NONE;

  @Column(name = "bill_discount_value", nullable = false)
  private long billDiscountValue;

  @Column(name = "customer_gstin", length = 15)
  private String customerGstin;

  @Enumerated(EnumType.STRING)
  @Column(name = "tax_jurisdiction", nullable = false, length = 8)
  private TaxJurisdiction taxJurisdiction = TaxJurisdiction.INTRA;

  @Column(name = "cgst_paise", nullable = false)
  private long cgstPaise;

  @Column(name = "sgst_paise", nullable = false)
  private long sgstPaise;

  @Column(name = "igst_paise", nullable = false)
  private long igstPaise;

  @Column(name = "round_off_paise", nullable = false)
  private long roundOffPaise;

  @Column(name = "discount_approval_request_id")
  private UUID discountApprovalRequestId;

  @Enumerated(EnumType.STRING)
  @Column(name = "discount_approval_status", nullable = false, length = 16)
  private DiscountApprovalStatus discountApprovalStatus = DiscountApprovalStatus.NOT_REQUIRED;

  @Column(name = "tax_adjustment_reason", length = 500)
  private String taxAdjustmentReason;

  @Column(name = "tax_adjusted", nullable = false)
  private boolean taxAdjusted;

  @Column(name = "amount_paid_paise", nullable = false)
  private long amountPaidPaise;

  @Column(name = "amount_due_paise", nullable = false)
  private long amountDuePaise;

  @Column(name = "change_paise", nullable = false)
  private long changePaise;

  @Column(name = "loyalty_redeem_points", nullable = false)
  private long loyaltyRedeemPoints;

  @Column(name = "loyalty_redeem_paise", nullable = false)
  private long loyaltyRedeemPaise;

  @Column(name = "loyalty_earned_points", nullable = false)
  private long loyaltyEarnedPoints;

  @Column(name = "loyalty_taxable_paise", nullable = false)
  private long loyaltyTaxablePaise;

  @Column(name = "loyalty_pending_taxable_paise", nullable = false)
  private long loyaltyPendingTaxablePaise;

  @Column(name = "completed_at")
  private Instant completedAt;

  @Column(name = "complete_idempotency_key", length = 128)
  private String completeIdempotencyKey;

  @Column(name = "idempotency_key", nullable = false, length = 128)
  private String idempotencyKey;

  @Column(nullable = false)
  private int version;

  @Column(name = "created_at", nullable = false)
  private Instant createdAt;

  @Column(name = "updated_at", nullable = false)
  private Instant updatedAt;
}
