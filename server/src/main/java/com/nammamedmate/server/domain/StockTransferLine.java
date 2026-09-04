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
@Table(name = "stock_transfer_line")
@Getter
@Setter
public class StockTransferLine {

  @Id private UUID id;

  @Column(name = "transfer_id", nullable = false)
  private UUID transferId;

  @Column(name = "tenant_id", nullable = false)
  private UUID tenantId;

  @Column(name = "product_id", nullable = false)
  private UUID productId;

  @Column(name = "batch_id")
  private UUID batchId;

  @Column(nullable = false, precision = 19, scale = 6)
  private BigDecimal quantity;

  @Column(name = "created_at", nullable = false)
  private Instant createdAt;
}
