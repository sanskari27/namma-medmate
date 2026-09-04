package com.nammamedmate.server.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;
import lombok.Getter;
import lombok.Setter;

@Entity
@Table(name = "branch_product_stock_level")
@Getter
@Setter
public class BranchProductStockLevel {

  @Id private UUID id;

  @Column(name = "tenant_id", nullable = false)
  private UUID tenantId;

  @Column(name = "branch_id", nullable = false)
  private UUID branchId;

  @Column(name = "product_id", nullable = false)
  private UUID productId;

  @Column(name = "reorder_level")
  private Integer reorderLevel;

  @Column(name = "reorder_quantity")
  private Integer reorderQuantity;

  @Column(name = "minimum_stock")
  private Integer minimumStock;

  @Column(name = "created_at", nullable = false)
  private Instant createdAt;

  @Column(name = "updated_at", nullable = false)
  private Instant updatedAt;
}
