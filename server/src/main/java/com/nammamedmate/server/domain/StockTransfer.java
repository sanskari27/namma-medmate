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
@Table(name = "stock_transfer")
@Getter
@Setter
public class StockTransfer {

  @Id private UUID id;

  @Column(name = "tenant_id", nullable = false)
  private UUID tenantId;

  @Column(name = "from_branch_id", nullable = false)
  private UUID fromBranchId;

  @Column(name = "to_branch_id", nullable = false)
  private UUID toBranchId;

  @Enumerated(EnumType.STRING)
  @Column(nullable = false, length = 16)
  private StockTransferDirection direction;

  @Enumerated(EnumType.STRING)
  @Column(nullable = false, length = 32)
  private StockTransferStatus status;

  @Column(name = "idempotency_key", nullable = false, length = 128)
  private String idempotencyKey;

  @Column(name = "created_by_user_id", nullable = false)
  private UUID createdByUserId;

  @Column(name = "dispatched_by_user_id")
  private UUID dispatchedByUserId;

  @Column(name = "confirmed_by_user_id")
  private UUID confirmedByUserId;

  @Column(name = "rejected_by_user_id")
  private UUID rejectedByUserId;

  @Column(name = "cancelled_by_user_id")
  private UUID cancelledByUserId;

  @Column(nullable = false)
  private long version;

  @Column(name = "created_at", nullable = false)
  private Instant createdAt;

  @Column(name = "updated_at", nullable = false)
  private Instant updatedAt;
}
