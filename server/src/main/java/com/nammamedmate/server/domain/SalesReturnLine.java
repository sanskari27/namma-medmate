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
@Table(name = "sales_return_line")
@Getter
@Setter
public class SalesReturnLine {

  @Id private UUID id;

  @Column(name = "tenant_id", nullable = false)
  private UUID tenantId;

  @Column(name = "branch_id", nullable = false)
  private UUID branchId;

  @Column(name = "sales_return_id", nullable = false)
  private UUID salesReturnId;

  @Column(name = "sales_invoice_line_id", nullable = false)
  private UUID salesInvoiceLineId;

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

  @Column(name = "line_total_paise", nullable = false)
  private long lineTotalPaise;

  @Column(name = "refund_amount_paise", nullable = false)
  private long refundAmountPaise;

  @Column(name = "stock_movement_id")
  private UUID stockMovementId;

  @Column(name = "sort_order", nullable = false)
  private int sortOrder;

  @Column(name = "created_at", nullable = false)
  private Instant createdAt;
}
