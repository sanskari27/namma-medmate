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
@Table(name = "product")
@Getter
@Setter
public class Product {

  @Id private UUID id;

  @Column(name = "tenant_id", nullable = false)
  private UUID tenantId;

  @Column(nullable = false, length = 64)
  private String sku;

  @Column(length = 64)
  private String barcode;

  @Column(nullable = false, length = 200)
  private String name;

  @Column(name = "generic_name", length = 200)
  private String genericName;

  @Column(name = "brand_name", length = 200)
  private String brandName;

  @Column(name = "manufacturer_id")
  private UUID manufacturerId;

  @Column(name = "category_id", nullable = false)
  private UUID categoryId;

  @Enumerated(EnumType.STRING)
  @Column(name = "product_type", nullable = false, length = 32)
  private ProductType productType;

  @Enumerated(EnumType.STRING)
  @Column(name = "dosage_form", nullable = false, length = 32)
  private DosageForm dosageForm;

  @Column(name = "therapeutic_class", length = 200)
  private String therapeuticClass;

  @Column(columnDefinition = "TEXT")
  private String composition;

  @Column(length = 100)
  private String strength;

  @Enumerated(EnumType.STRING)
  @Column(length = 32)
  private ProductRoute route;

  @Column(name = "prescription_required", nullable = false)
  private boolean prescriptionRequired;

  @Enumerated(EnumType.STRING)
  @Column(name = "schedule_classification", length = 16)
  private ScheduleClassification scheduleClassification;

  @Column(name = "hsn_code", length = 16)
  private String hsnCode;

  @Column(name = "gst_rate", precision = 5, scale = 2)
  private BigDecimal gstRate;

  @Enumerated(EnumType.STRING)
  @Column(name = "base_unit", nullable = false, length = 32)
  private ProductUnit baseUnit;

  @Column(name = "pack_size", nullable = false, precision = 12, scale = 4)
  private BigDecimal packSize;

  @Enumerated(EnumType.STRING)
  @Column(name = "pack_unit", nullable = false, length = 32)
  private ProductUnit packUnit;

  @Column(name = "pack_description", length = 200)
  private String packDescription;

  @Column(name = "storage_conditions", length = 500)
  private String storageConditions;

  @Column(name = "requires_cold_storage", nullable = false)
  private boolean requiresColdStorage;

  @Column(name = "rack_location", length = 100)
  private String rackLocation;

  @Column(name = "reorder_level")
  private Integer reorderLevel;

  @Column(name = "reorder_quantity")
  private Integer reorderQuantity;

  @Column(name = "minimum_stock")
  private Integer minimumStock;

  @Column(name = "is_discontinued", nullable = false)
  private boolean discontinued;

  @Column(name = "is_returnable", nullable = false)
  private boolean returnable;

  @Column(name = "is_taxable", nullable = false)
  private boolean taxable;

  @Column(name = "tax_category", length = 64)
  private String taxCategory;

  @Column(name = "requires_batch_tracking", nullable = false)
  private boolean requiresBatchTracking;

  @Column(name = "requires_expiry_tracking", nullable = false)
  private boolean requiresExpiryTracking;

  @Column(name = "requires_serial_tracking", nullable = false)
  private boolean requiresSerialTracking;

  @Column(name = "controlled_substance", nullable = false)
  private boolean controlledSubstance;

  @Column(columnDefinition = "TEXT")
  private String notes;

  @Column(name = "is_active", nullable = false)
  private boolean active;

  @Column(name = "created_at", nullable = false)
  private Instant createdAt;

  @Column(name = "updated_at", nullable = false)
  private Instant updatedAt;
}
