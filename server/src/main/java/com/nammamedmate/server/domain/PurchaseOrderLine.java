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
@Table(name = "purchase_order_line")
@Getter
@Setter
public class PurchaseOrderLine {

  @Id private UUID id;

  @Column(name = "tenant_id", nullable = false)
  private UUID tenantId;

  @Column(name = "branch_id", nullable = false)
  private UUID branchId;

  @Column(name = "purchase_order_id", nullable = false)
  private UUID purchaseOrderId;

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

  @Column(name = "gst_rate", precision = 5, scale = 2)
  private BigDecimal gstRate;

  @Column(name = "line_subtotal_paise", nullable = false)
  private long lineSubtotalPaise;

  @Column(name = "line_tax_paise", nullable = false)
  private long lineTaxPaise;

  @Column(name = "line_total_paise", nullable = false)
  private long lineTotalPaise;

  @Column(name = "sort_order", nullable = false)
  private int sortOrder;

  @Column(name = "created_at", nullable = false)
  private Instant createdAt;
}
