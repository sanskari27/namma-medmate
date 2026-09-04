package com.nammamedmate.server.application.product;

import com.nammamedmate.server.domain.DosageForm;
import com.nammamedmate.server.domain.ProductRoute;
import com.nammamedmate.server.domain.ProductType;
import com.nammamedmate.server.domain.ProductUnit;
import com.nammamedmate.server.domain.ScheduleClassification;
import java.math.BigDecimal;
import java.util.UUID;

public record ProductCommand(
    String sku,
    String barcode,
    String name,
    String genericName,
    String brandName,
    UUID manufacturerId,
    UUID categoryId,
    ProductType productType,
    DosageForm dosageForm,
    String therapeuticClass,
    String composition,
    String strength,
    ProductRoute route,
    Boolean prescriptionRequired,
    ScheduleClassification scheduleClassification,
    String hsnCode,
    BigDecimal gstRate,
    ProductUnit baseUnit,
    BigDecimal packSize,
    ProductUnit packUnit,
    String packDescription,
    String storageConditions,
    Boolean requiresColdStorage,
    String rackLocation,
    Integer reorderLevel,
    Integer reorderQuantity,
    Integer minimumStock,
    Boolean discontinued,
    Boolean returnable,
    Boolean taxable,
    String taxCategory,
    Boolean requiresBatchTracking,
    Boolean requiresExpiryTracking,
    Boolean requiresSerialTracking,
    Boolean controlledSubstance,
    String notes,
    Boolean active) {}
