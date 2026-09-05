package com.nammamedmate.server.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;
import lombok.Getter;
import lombok.Setter;

@Entity
@Table(name = "purchase_order")
@Getter
@Setter
public class PurchaseOrder {

  @Id private UUID id;

  @Column(name = "tenant_id", nullable = false)
  private UUID tenantId;

  @Column(name = "branch_id", nullable = false)
  private UUID branchId;

  @Column(name = "supplier_id", nullable = false)
  private UUID supplierId;

  @Column(name = "po_number", nullable = false, length = 48)
  private String poNumber;

  @Enumerated(EnumType.STRING)
  @Column(nullable = false, length = 16)
  private PurchaseOrderStatus status;

  @Column(name = "expected_delivery_date")
  private LocalDate expectedDeliveryDate;

  @Enumerated(EnumType.STRING)
  @Column(name = "payment_terms", nullable = false, length = 16)
  private SupplierPaymentTerms paymentTerms;

  @Column(columnDefinition = "TEXT")
  private String notes;

  @Column(nullable = false)
  private int version;

  @Column(name = "subtotal_paise", nullable = false)
  private long subtotalPaise;

  @Column(name = "tax_paise", nullable = false)
  private long taxPaise;

  @Column(name = "total_paise", nullable = false)
  private long totalPaise;

  @Column(name = "idempotency_key", nullable = false, length = 128)
  private String idempotencyKey;

  @Column(name = "created_by_user_id", nullable = false)
  private UUID createdByUserId;

  @Column(name = "created_at", nullable = false)
  private Instant createdAt;

  @Column(name = "updated_at", nullable = false)
  private Instant updatedAt;
}
