package com.nammamedmate.server.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;
import lombok.Getter;
import lombok.Setter;

@Entity
@Table(name = "stock_batch")
@Getter
@Setter
public class StockBatch {

  @Id private UUID id;

  @Column(name = "tenant_id", nullable = false)
  private UUID tenantId;

  @Column(name = "product_id", nullable = false)
  private UUID productId;

  @Column(name = "batch_number", nullable = false, length = 64)
  private String batchNumber;

  @Column(name = "manufactured_on")
  private LocalDate manufacturedOn;

  @Column(name = "expires_on")
  private LocalDate expiresOn;

  @Column(name = "purchase_price_paise", nullable = false)
  private long purchasePricePaise;

  @Column(name = "created_at", nullable = false)
  private Instant createdAt;

  @Column(name = "updated_at", nullable = false)
  private Instant updatedAt;
}
