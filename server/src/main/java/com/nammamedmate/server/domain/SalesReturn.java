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
@Table(name = "sales_return")
@Getter
@Setter
public class SalesReturn {

  @Id private UUID id;

  @Column(name = "tenant_id", nullable = false)
  private UUID tenantId;

  @Column(name = "branch_id", nullable = false)
  private UUID branchId;

  @Column(name = "sales_invoice_id", nullable = false)
  private UUID salesInvoiceId;

  @Column(name = "customer_id")
  private UUID customerId;

  @Column(nullable = false, length = 500)
  private String reason;

  @Enumerated(EnumType.STRING)
  @Column(nullable = false, length = 16)
  private SalesReturnDecision decision;

  @Enumerated(EnumType.STRING)
  @Column(name = "refund_mode", nullable = false, length = 16)
  private SalesReturnRefundMode refundMode;

  @Column(name = "refund_total_paise", nullable = false)
  private long refundTotalPaise;

  @Column(name = "cash_refund_paise", nullable = false)
  private long cashRefundPaise;

  @Column(name = "credit_note_paise", nullable = false)
  private long creditNotePaise;

  @Column(name = "idempotency_key", nullable = false, length = 128)
  private String idempotencyKey;

  @Column(name = "created_by_user_id", nullable = false)
  private UUID createdByUserId;

  @Column(name = "created_at", nullable = false)
  private Instant createdAt;
}
