package com.nammamedmate.server.application.inventory;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

public record InventoryAlertsView(
    List<LowStockAlertView> lowStock, List<NearExpiryAlertView> nearExpiry) {

  public record LowStockAlertView(
      UUID productId,
      String productSku,
      String productName,
      BigDecimal onHand,
      Integer reorderLevel,
      Integer minimumStock,
      List<OtherBranchStockView> otherBranches) {}

  public record OtherBranchStockView(UUID branchId, String branchName, BigDecimal quantity) {}

  public record NearExpiryAlertView(
      UUID productId,
      String productSku,
      String productName,
      UUID batchId,
      String batchNumber,
      LocalDate expiresOn,
      BigDecimal quantity) {}
}
