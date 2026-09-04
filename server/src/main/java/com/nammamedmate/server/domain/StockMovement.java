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
@Table(name = "stock_movement")
@Getter
@Setter
public class StockMovement {

  @Id private UUID id;

  @Column(name = "tenant_id", nullable = false)
  private UUID tenantId;

  @Column(name = "branch_id", nullable = false)
  private UUID branchId;

  @Column(name = "product_id", nullable = false)
  private UUID productId;

  @Column(name = "batch_id")
  private UUID batchId;

  @Column(name = "balance_id", nullable = false)
  private UUID balanceId;

  @Enumerated(EnumType.STRING)
  @Column(nullable = false, length = 32)
  private StockMovementType type;

  @Column(nullable = false, precision = 19, scale = 6)
  private BigDecimal quantity;

  @Column(name = "balance_after", nullable = false, precision = 19, scale = 6)
  private BigDecimal balanceAfter;

  @Column(name = "purchase_price_paise")
  private Long purchasePricePaise;

  @Column(name = "idempotency_key", nullable = false, length = 128)
  private String idempotencyKey;

  @Column(name = "created_by_user_id", nullable = false)
  private UUID createdByUserId;

  @Column(name = "occurred_at", nullable = false)
  private Instant occurredAt;

  @Column(name = "created_at", nullable = false)
  private Instant createdAt;
}
