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
@Table(name = "purchase_return_line")
@Getter
@Setter
public class PurchaseReturnLine {

  @Id private UUID id;

  @Column(name = "tenant_id", nullable = false)
  private UUID tenantId;

  @Column(name = "branch_id", nullable = false)
  private UUID branchId;

  @Column(name = "purchase_return_id", nullable = false)
  private UUID purchaseReturnId;

  @Column(name = "goods_receipt_line_id")
  private UUID goodsReceiptLineId;

  @Column(name = "product_id", nullable = false)
  private UUID productId;

  @Column(name = "product_name", nullable = false, length = 200)
  private String productName;

  @Column(nullable = false, length = 64)
  private String sku;

  @Column(name = "batch_id")
  private UUID batchId;

  @Column(nullable = false, precision = 19, scale = 6)
  private BigDecimal quantity;

  @Column(name = "unit_rate_paise", nullable = false)
  private long unitRatePaise;

  @Column(name = "amount_paise", nullable = false)
  private long amountPaise;

  @Column(name = "stock_movement_id")
  private UUID stockMovementId;

  @Column(name = "sort_order", nullable = false)
  private int sortOrder;

  @Column(name = "created_at", nullable = false)
  private Instant createdAt;
}
