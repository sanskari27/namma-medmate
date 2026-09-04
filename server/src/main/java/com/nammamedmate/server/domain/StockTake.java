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
@Table(name = "stock_take")
@Getter
@Setter
public class StockTake {

  @Id private UUID id;

  @Column(name = "tenant_id", nullable = false)
  private UUID tenantId;

  @Column(name = "branch_id", nullable = false)
  private UUID branchId;

  @Enumerated(EnumType.STRING)
  @Column(nullable = false, length = 16)
  private StockTakeStatus status;

  @Column(name = "started_by_user_id", nullable = false)
  private UUID startedByUserId;

  @Column(name = "posted_by_user_id")
  private UUID postedByUserId;

  @Column(name = "cancelled_by_user_id")
  private UUID cancelledByUserId;

  @Column(name = "idempotency_key", nullable = false, length = 128)
  private String idempotencyKey;

  @Column(nullable = false)
  private int version = 1;

  @Column(name = "created_at", nullable = false)
  private Instant createdAt;

  @Column(name = "updated_at", nullable = false)
  private Instant updatedAt;

  @Column(name = "posted_at")
  private Instant postedAt;

  @Column(name = "cancelled_at")
  private Instant cancelledAt;
}
