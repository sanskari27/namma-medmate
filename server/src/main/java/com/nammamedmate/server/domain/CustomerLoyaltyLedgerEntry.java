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
@Table(name = "customer_loyalty_ledger_entry")
@Getter
@Setter
public class CustomerLoyaltyLedgerEntry {

  @Id private UUID id;

  @Column(name = "tenant_id", nullable = false)
  private UUID tenantId;

  @Column(name = "customer_id", nullable = false)
  private UUID customerId;

  @Column(name = "account_id", nullable = false)
  private UUID accountId;

  @Enumerated(EnumType.STRING)
  @Column(nullable = false, length = 32)
  private LoyaltyLedgerType type;

  @Column(nullable = false)
  private long points;

  @Column(name = "delta_points", nullable = false)
  private long deltaPoints;

  @Column(name = "balance_after_points", nullable = false)
  private long balanceAfterPoints;

  @Column(name = "invoice_id")
  private UUID invoiceId;

  @Column(name = "sales_return_id")
  private UUID salesReturnId;

  @Column(name = "taxable_paise", nullable = false)
  private long taxablePaise;

  @Column(length = 200)
  private String reason;

  @Column(name = "idempotency_key", length = 128)
  private String idempotencyKey;

  @Column(name = "created_by_user_id", nullable = false)
  private UUID createdByUserId;

  @Column(name = "occurred_at", nullable = false)
  private Instant occurredAt;

  @Column(name = "created_at", nullable = false)
  private Instant createdAt;
}
