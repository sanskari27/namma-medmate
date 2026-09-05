package com.nammamedmate.server.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.util.UUID;
import lombok.Getter;
import lombok.Setter;

@Entity
@Table(name = "supplier_category")
@Getter
@Setter
public class SupplierCategory {

  @Id private UUID id;

  @Column(name = "tenant_id", nullable = false)
  private UUID tenantId;

  @Column(name = "supplier_id", nullable = false)
  private UUID supplierId;

  @Column(name = "category_id", nullable = false)
  private UUID categoryId;
}
