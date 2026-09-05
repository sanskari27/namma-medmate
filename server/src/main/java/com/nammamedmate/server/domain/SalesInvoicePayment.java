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
@Table(name = "sales_invoice_payment")
@Getter
@Setter
public class SalesInvoicePayment {

  @Id private UUID id;

  @Column(name = "tenant_id", nullable = false)
  private UUID tenantId;

  @Column(name = "branch_id", nullable = false)
  private UUID branchId;

  @Column(name = "sales_invoice_id", nullable = false)
  private UUID salesInvoiceId;

  @Enumerated(EnumType.STRING)
  @Column(nullable = false, length = 16)
  private PaymentMode mode;

  @Column(name = "amount_paise", nullable = false)
  private long amountPaise;

  @Column(length = 64)
  private String reference;

  @Column(name = "sort_order", nullable = false)
  private int sortOrder;

  @Column(name = "created_at", nullable = false)
  private Instant createdAt;
}
