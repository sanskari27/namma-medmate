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
@Table(name = "hospital_return_line")
@Getter
@Setter
public class HospitalReturnLine {

  @Id private UUID id;

  @Column(name = "tenant_id", nullable = false)
  private UUID tenantId;

  @Column(name = "branch_id", nullable = false)
  private UUID branchId;

  @Column(name = "return_id", nullable = false)
  private UUID returnId;

  @Column(name = "issue_line_id", nullable = false)
  private UUID issueLineId;

  @Column(name = "product_id", nullable = false)
  private UUID productId;

  @Column(name = "batch_id")
  private UUID batchId;

  @Column(nullable = false, precision = 19, scale = 6)
  private BigDecimal quantity;

  @Column(name = "credit_price_paise", nullable = false)
  private long creditPricePaise;

  @Column(name = "amount_paise", nullable = false)
  private long amountPaise;

  @Column(name = "sort_order", nullable = false)
  private int sortOrder;

  @Column(name = "created_at", nullable = false)
  private Instant createdAt;
}
