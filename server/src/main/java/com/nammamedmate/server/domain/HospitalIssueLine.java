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
@Table(name = "hospital_issue_line")
@Getter
@Setter
public class HospitalIssueLine {

  @Id private UUID id;

  @Column(name = "tenant_id", nullable = false)
  private UUID tenantId;

  @Column(name = "branch_id", nullable = false)
  private UUID branchId;

  @Column(name = "issue_id", nullable = false)
  private UUID issueId;

  @Column(name = "product_id", nullable = false)
  private UUID productId;

  @Column(name = "product_name", nullable = false, length = 200)
  private String productName;

  @Column(nullable = false, length = 64)
  private String sku;

  @Column(name = "batch_id")
  private UUID batchId;

  @Column(name = "batch_number", length = 64)
  private String batchNumber;

  @Column(name = "expiry_on")
  private LocalDate expiryOn;

  @Column(name = "hsn_code", length = 16)
  private String hsnCode;

  @Column(name = "gst_rate", precision = 5, scale = 2)
  private BigDecimal gstRate;

  @Column(nullable = false, precision = 19, scale = 6)
  private BigDecimal quantity;

  @Column(name = "mrp_paise", nullable = false)
  private long mrpPaise;

  @Column(name = "credit_price_paise", nullable = false)
  private long creditPricePaise;

  @Column(name = "discount_bps", nullable = false)
  private int discountBps;

  @Column(name = "amount_paise", nullable = false)
  private long amountPaise;

  @Column(name = "sort_order", nullable = false)
  private int sortOrder;

  @Column(name = "created_at", nullable = false)
  private Instant createdAt;
}
