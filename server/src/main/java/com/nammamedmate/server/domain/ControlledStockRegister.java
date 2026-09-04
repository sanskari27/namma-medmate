package com.nammamedmate.server.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;
import lombok.Getter;
import lombok.Setter;

@Entity
@Table(name = "controlled_stock_register")
@Getter
@Setter
public class ControlledStockRegister {

  @Id private UUID id;

  @Column(name = "tenant_id", nullable = false)
  private UUID tenantId;

  @Column(name = "branch_id", nullable = false)
  private UUID branchId;

  @Column(name = "stock_movement_id", nullable = false)
  private UUID stockMovementId;

  @Column(name = "product_id", nullable = false)
  private UUID productId;

  @Column(name = "product_name", nullable = false, length = 200)
  private String productName;

  @Column(nullable = false, length = 64)
  private String sku;

  @Enumerated(EnumType.STRING)
  @Column(name = "schedule_classification", length = 16)
  private ScheduleClassification scheduleClassification;

  @Column(name = "batch_id")
  private UUID batchId;

  @Column(name = "batch_number", length = 64)
  private String batchNumber;

  @Column(name = "expires_on")
  private LocalDate expiresOn;

  @Column(nullable = false, precision = 19, scale = 6)
  private BigDecimal quantity;

  @Column(name = "balance_after", nullable = false, precision = 19, scale = 6)
  private BigDecimal balanceAfter;

  @Enumerated(EnumType.STRING)
  @Column(name = "movement_type", nullable = false, length = 32)
  private StockMovementType movementType;

  @Column(name = "created_by_user_id", nullable = false)
  private UUID createdByUserId;

  @Column(name = "occurred_at", nullable = false)
  private Instant occurredAt;

  @Column(name = "created_at", nullable = false)
  private Instant createdAt;
}
