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
@Table(name = "customer_credit_ledger_entry")
@Getter
@Setter
public class CustomerCreditLedgerEntry {

  @Id private UUID id;

  @Column(name = "tenant_id", nullable = false)
  private UUID tenantId;

  @Column(name = "customer_id", nullable = false)
  private UUID customerId;

  @Column(name = "account_id", nullable = false)
  private UUID accountId;

  @Enumerated(EnumType.STRING)
  @Column(nullable = false, length = 32)
  private CustomerCreditLedgerType type;

  @Column(name = "amount_paise", nullable = false)
  private long amountPaise;

  @Column(name = "balance_after_paise", nullable = false)
  private long balanceAfterPaise;

  @Column(name = "invoice_id")
  private UUID invoiceId;

  @Column(name = "settlement_mode", length = 64)
  private String settlementMode;

  @Column(name = "settlement_reference", length = 200)
  private String settlementReference;

  @Column(name = "idempotency_key", length = 128)
  private String idempotencyKey;

  @Column(name = "created_by_user_id", nullable = false)
  private UUID createdByUserId;

  @Column(name = "occurred_at", nullable = false)
  private Instant occurredAt;

  @Column(name = "created_at", nullable = false)
  private Instant createdAt;
}
