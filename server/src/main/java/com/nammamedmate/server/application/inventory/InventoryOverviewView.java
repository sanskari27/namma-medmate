package com.nammamedmate.server.application.inventory;

import com.nammamedmate.server.domain.ProductUnit;
import com.nammamedmate.server.domain.ScheduleClassification;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

public record InventoryOverviewView(
    InventoryOverviewSummary summary, List<InventoryOverviewRow> items) {

  public record InventoryOverviewSummary(
      int totalSkus,
      BigDecimal totalUnits,
      long stockValueCostPaise,
      long retailValueMrpPaise,
      Integer marginPercent,
      int lowStockCount,
      int outOfStockCount,
      int expiringCount,
      long expiringValuePaise,
      int deadStockCount,
      long deadStockValuePaise,
      int alertCount) {}

  public record InventoryOverviewRow(
      UUID productId,
      String sku,
      String name,
      String genericName,
      String brandName,
      String manufacturerName,
      UUID categoryId,
      String categoryName,
      String categoryIcon,
      ScheduleClassification scheduleClassification,
      boolean prescriptionRequired,
      String rackLocation,
      ProductUnit baseUnit,
      ProductUnit packUnit,
      BigDecimal packSize,
      int batchCount,
      LocalDate earliestExpiry,
      boolean expired,
      boolean nearExpiry,
      BigDecimal onHandQuantity,
      boolean lowStock,
      boolean outOfStock,
      Long mrpPaise,
      long costValuePaise,
      long retailValuePaise,
      Long looseUnitPaise,
      boolean looseSellingEnabled,
      boolean onlineListed,
      boolean unallocated,
      boolean deadStock) {}
}
