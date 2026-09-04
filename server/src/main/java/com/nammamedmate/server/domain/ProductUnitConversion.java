package com.nammamedmate.server.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;
import lombok.Getter;
import lombok.Setter;

@Entity
@Table(name = "product_unit_conversion")
@Getter
@Setter
public class ProductUnitConversion {

  @Id private UUID id;

  @Column(name = "tenant_id", nullable = false)
  private UUID tenantId;

  @Column(name = "product_id", nullable = false)
  private UUID productId;

  @Enumerated(EnumType.STRING)
  @Column(nullable = false, length = 32)
  private ProductUnit unit;

  @Column(name = "factor_to_base", nullable = false, precision = 18, scale = 6)
  private BigDecimal factorToBase;

  @Column(nullable = false)
  private int version;

  @Column(name = "created_at", nullable = false)
  private Instant createdAt;

  @Column(name = "updated_at", nullable = false)
  private Instant updatedAt;
}
