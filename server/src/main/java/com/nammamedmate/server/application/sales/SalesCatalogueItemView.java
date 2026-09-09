package com.nammamedmate.server.application.sales;

import com.nammamedmate.server.domain.DosageForm;
import com.nammamedmate.server.domain.ProductUnit;
import com.nammamedmate.server.domain.ScheduleClassification;
import java.math.BigDecimal;
import java.util.UUID;

public record SalesCatalogueItemView(
    UUID id,
    String sku,
    String barcode,
    String name,
    String genericName,
    String brandName,
    UUID categoryId,
    String categoryName,
    String categoryIcon,
    DosageForm dosageForm,
    boolean prescriptionRequired,
    ScheduleClassification scheduleClassification,
    boolean controlledSubstance,
    ProductUnit baseUnit,
    BigDecimal packSize,
    ProductUnit packUnit,
    String packDescription,
    String rackLocation,
    Integer reorderLevel,
    Integer minimumStock,
    boolean requiresBatchTracking,
    boolean active,
    BigDecimal onHandQuantity,
    Long suggestedMrpPaise,
    Long suggestedSellingPaise) {}
