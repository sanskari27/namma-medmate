package com.nammamedmate.server.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;
import lombok.Getter;
import lombok.Setter;

@Entity
@Table(name = "stock_take_line")
@Getter
@Setter
public class StockTakeLine {

  @Id private UUID id;

  @Column(name = "tenant_id", nullable = false)
  private UUID tenantId;

  @Column(name = "stock_take_id", nullable = false)
  private UUID stockTakeId;

  @Column(name = "product_id", nullable = false)
  private UUID productId;

  @Column(name = "batch_id")
  private UUID batchId;

  @Column(name = "expected_quantity", nullable = false, precision = 19, scale = 6)
  private BigDecimal expectedQuantity;

  @Column(name = "counted_quantity", precision = 19, scale = 6)
  private BigDecimal countedQuantity;

  @Column(name = "counted_by_user_id")
  private UUID countedByUserId;

  @Column(name = "counted_at")
  private Instant countedAt;

  @Column(name = "adjustment_id")
  private UUID adjustmentId;

  @Column(name = "created_at", nullable = false)
  private Instant createdAt;

  @Column(name = "updated_at", nullable = false)
  private Instant updatedAt;
}
