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
@Table(name = "purchase_return")
@Getter
@Setter
public class PurchaseReturn {

  @Id private UUID id;

  @Column(name = "tenant_id", nullable = false)
  private UUID tenantId;

  @Column(name = "branch_id", nullable = false)
  private UUID branchId;

  @Column(name = "supplier_id", nullable = false)
  private UUID supplierId;

  @Column(name = "goods_receipt_id")
  private UUID goodsReceiptId;

  @Enumerated(EnumType.STRING)
  @Column(nullable = false, length = 16)
  private PurchaseReturnOrigin origin;

  @Enumerated(EnumType.STRING)
  @Column(nullable = false, length = 16)
  private PurchaseReturnStatus status;

  @Column(name = "debit_note_number", nullable = false, length = 48)
  private String debitNoteNumber;

  @Column(name = "amount_paise", nullable = false)
  private long amountPaise;

  @Column(name = "idempotency_key", nullable = false, length = 128)
  private String idempotencyKey;

  @Column(name = "created_by_user_id", nullable = false)
  private UUID createdByUserId;

  @Column(name = "created_at", nullable = false)
  private Instant createdAt;
}
