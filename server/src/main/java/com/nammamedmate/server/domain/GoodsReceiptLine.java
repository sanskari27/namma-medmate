package com.nammamedmate.server.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;
import lombok.Getter;
import lombok.Setter;

@Entity
@Table(name = "goods_receipt_line")
@Getter
@Setter
public class GoodsReceiptLine {

  @Id private UUID id;

  @Column(name = "tenant_id", nullable = false)
  private UUID tenantId;

  @Column(name = "branch_id", nullable = false)
  private UUID branchId;

  @Column(name = "goods_receipt_id", nullable = false)
  private UUID goodsReceiptId;

  @Column(name = "purchase_order_line_id", nullable = false)
  private UUID purchaseOrderLineId;

  @Column(name = "product_id", nullable = false)
  private UUID productId;

  @Column(name = "product_name", nullable = false, length = 200)
  private String productName;

  @Column(nullable = false, length = 64)
  private String sku;

  @Column(nullable = false, precision = 19, scale = 6)
  private BigDecimal quantity;

  @Column(name = "unit_rate_paise", nullable = false)
  private long unitRatePaise;

  @Column(name = "sort_order", nullable = false)
  private int sortOrder;

  @Column(name = "created_at", nullable = false)
  private Instant createdAt;

  @Column(name = "accepted_quantity", precision = 19, scale = 6)
  private BigDecimal acceptedQuantity;

  @Column(name = "rejected_quantity", precision = 19, scale = 6)
  private BigDecimal rejectedQuantity;

  @Column(name = "batch_number", length = 64)
  private String batchNumber;

  @Column(name = "manufactured_on")
  private LocalDate manufacturedOn;

  @Column(name = "expires_on")
  private LocalDate expiresOn;

  @Column(name = "stock_movement_id")
  private UUID stockMovementId;
}
