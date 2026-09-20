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
@Table(name = "hospital_ledger_entry")
@Getter
@Setter
public class HospitalLedgerEntry {

  @Id private UUID id;

  @Column(name = "tenant_id", nullable = false)
  private UUID tenantId;

  @Column(name = "branch_id", nullable = false)
  private UUID branchId;

  @Column(name = "account_id", nullable = false)
  private UUID accountId;

  @Enumerated(EnumType.STRING)
  @Column(nullable = false, length = 16)
  private HospitalLedgerKind kind;

  @Column(name = "debit_paise", nullable = false)
  private long debitPaise;

  @Column(name = "credit_paise", nullable = false)
  private long creditPaise;

  @Column(name = "issue_id")
  private UUID issueId;

  @Column(name = "return_id")
  private UUID returnId;

  @Column(name = "payment_mode", length = 64)
  private String paymentMode;

  @Column(name = "payment_reference", length = 80)
  private String paymentReference;

  @Column(length = 240)
  private String particulars;

  @Column(name = "occurred_at", nullable = false)
  private Instant occurredAt;

  @Column(name = "idempotency_key", nullable = false, length = 80)
  private String idempotencyKey;

  @Column(name = "created_at", nullable = false)
  private Instant createdAt;
}
