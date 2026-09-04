package com.nammamedmate.server.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;
import lombok.Getter;
import lombok.Setter;

@Entity
@Table(name = "stock_adjustment")
@Getter
@Setter
public class StockAdjustment {

  @Id private UUID id;

  @Column(name = "tenant_id", nullable = false)
  private UUID tenantId;

  @Column(name = "branch_id", nullable = false)
  private UUID branchId;

  @Column(name = "product_id", nullable = false)
  private UUID productId;

  @Column(name = "batch_id")
  private UUID batchId;

  @Enumerated(EnumType.STRING)
  @Column(nullable = false, length = 32)
  private StockAdjustmentReason reason;

  @Column(nullable = false, precision = 19, scale = 6)
  private BigDecimal quantity;

  @Enumerated(EnumType.STRING)
  @Column(nullable = false, length = 8)
  private StockAdjustmentDirection direction;

  @Enumerated(EnumType.STRING)
  @Column(nullable = false, length = 16)
  private StockAdjustmentStatus status;

  @Column(name = "requester_user_id", nullable = false)
  private UUID requesterUserId;

  @Column(name = "approver_user_id")
  private UUID approverUserId;

  @Column(name = "approval_request_id", nullable = false)
  private UUID approvalRequestId;

  @Column(name = "idempotency_key", nullable = false, length = 128)
  private String idempotencyKey;

  @Column(nullable = false)
  private int version = 1;

  @Column(name = "created_at", nullable = false)
  private Instant createdAt;

  @Column(name = "updated_at", nullable = false)
  private Instant updatedAt;

  @Column(name = "decided_at")
  private Instant decidedAt;
}
