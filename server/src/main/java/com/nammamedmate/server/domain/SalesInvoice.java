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

  @Column(name = "idempotency_key", nullable = false, length = 128)
  private String idempotencyKey;

  @Column(nullable = false)
  private int version;

  @Column(name = "created_at", nullable = false)
  private Instant createdAt;

  @Column(name = "updated_at", nullable = false)
  private Instant updatedAt;
}
