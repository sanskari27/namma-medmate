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
@Table(name = "sales_prescription_fulfillment")
@Getter
@Setter
public class SalesPrescriptionFulfillment {

  @Id private UUID id;

  @Column(name = "tenant_id", nullable = false)
  private UUID tenantId;

  @Column(name = "customer_id", nullable = false)
  private UUID customerId;

  @Column(name = "doctor_id")
  private UUID doctorId;

  @Column(name = "prescription_reference", nullable = false, length = 64)
  private String prescriptionReference;

  @Column(name = "product_id", nullable = false)
  private UUID productId;

  @Column(name = "prescribed_quantity", nullable = false, precision = 19, scale = 6)
  private BigDecimal prescribedQuantity;

  @Column(name = "fulfilled_quantity", nullable = false, precision = 19, scale = 6)
  private BigDecimal fulfilledQuantity;

  @Column(name = "created_at", nullable = false)
  private Instant createdAt;

  @Column(name = "updated_at", nullable = false)
  private Instant updatedAt;
}
