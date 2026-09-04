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
@Table(name = "customer_history_fact")
@Getter
@Setter
public class CustomerHistoryFact {

  @Id private UUID id;

  @Column(name = "tenant_id", nullable = false)
  private UUID tenantId;

  @Column(name = "customer_id", nullable = false)
  private UUID customerId;

  @Column(name = "branch_id")
  private UUID branchId;

  @Enumerated(EnumType.STRING)
  @Column(nullable = false, length = 32)
  private CustomerHistoryFactType type;

  @Column(nullable = false, length = 500)
  private String summary;

  @Column(name = "prescription_reference", length = 200)
  private String prescriptionReference;

  @Column(name = "doctor_id")
  private UUID doctorId;

  @Column(name = "invoice_id")
  private UUID invoiceId;

  @Column(name = "amount_paise")
  private Long amountPaise;

  @Column(name = "occurred_at", nullable = false)
  private Instant occurredAt;

  @Column(name = "created_at", nullable = false)
  private Instant createdAt;
}
