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
@Table(name = "expense")
@Getter
@Setter
public class Expense {

  @Id private UUID id;

  @Column(name = "tenant_id", nullable = false)
  private UUID tenantId;

  @Column(name = "branch_id", nullable = false)
  private UUID branchId;

  @Column(name = "category_id", nullable = false)
  private UUID categoryId;

  @Column(name = "category_code", nullable = false, length = 32)
  private String categoryCode;

  @Column(name = "category_label", nullable = false, length = 80)
  private String categoryLabel;

  @Column(name = "amount_paise", nullable = false)
  private long amountPaise;

  @Column(name = "occurred_on", nullable = false)
  private LocalDate occurredOn;

  @Enumerated(EnumType.STRING)
  @Column(nullable = false, length = 16)
  private ExpensePostingStatus status;

  @Column(length = 500)
  private String notes;

  @Column(name = "current_evidence_id")
  private UUID currentEvidenceId;

  @Column(name = "idempotency_key", length = 128)
  private String idempotencyKey;

  @Column(nullable = false)
  private int version;

  @Column(name = "created_by", nullable = false)
  private UUID createdBy;

  @Column(name = "created_at", nullable = false)
  private Instant createdAt;

  @Column(name = "updated_at", nullable = false)
  private Instant updatedAt;
}
