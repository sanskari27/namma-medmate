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
@Table(name = "supplier_ledger_entry")
@Getter
@Setter
public class SupplierLedgerEntry {

  @Id private UUID id;

  @Column(name = "tenant_id", nullable = false)
  private UUID tenantId;

  @Column(name = "branch_id", nullable = false)
  private UUID branchId;

  @Column(name = "supplier_id", nullable = false)
  private UUID supplierId;

  @Column(name = "account_id", nullable = false)
  private UUID accountId;

  @Enumerated(EnumType.STRING)
  @Column(nullable = false, length = 32)
  private SupplierLedgerType type;

  @Column(name = "amount_paise", nullable = false)
  private long amountPaise;

  @Column(name = "balance_after_paise", nullable = false)
  private long balanceAfterPaise;

  @Column(name = "goods_receipt_id")
  private UUID goodsReceiptId;

  @Column(name = "purchase_return_id")
  private UUID purchaseReturnId;

  @Column(name = "payment_mode", length = 64)
  private String paymentMode;

  @Column(name = "payment_reference", length = 200)
  private String paymentReference;

  @Column(name = "due_on")
  private LocalDate dueOn;

  @Column(name = "idempotency_key", length = 128)
  private String idempotencyKey;

  @Column(name = "created_by_user_id", nullable = false)
  private UUID createdByUserId;

  @Column(name = "occurred_at", nullable = false)
  private Instant occurredAt;

  @Column(name = "created_at", nullable = false)
  private Instant createdAt;
}
