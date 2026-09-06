package com.nammamedmate.server.application.dashboard;

import com.fasterxml.jackson.annotation.JsonInclude;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@JsonInclude(JsonInclude.Include.NON_NULL)
public record DashboardView(
    String role,
    LocalDate asOf,
    Instant generatedAt,
    String scope,
    UUID branchId,
    String branchName,
    List<String> permittedRoles,
    CashierDesk cashier,
    InventoryDesk inventory,
    AccountantDesk accountant,
    OwnerDesk owner) {

  public record CashierDesk(
      long todaySalesPaise, int todayBillCount, List<HoldItem> holds, TillSources sources) {}

  public record HoldItem(UUID id, String invoiceNumber, long totalPaise, Instant heldAt) {}

  public record TillSources(String sales, String holds) {}

  public record InventoryDesk(
      List<LowStockItem> lowStock,
      List<TransferItem> pendingTransfers,
      List<GrnItem> pendingGrn,
      StockSources sources) {}

  public record LowStockItem(
      UUID productId, String sku, String productName, BigDecimal onHand, Integer reorderLevel) {}

  public record TransferItem(UUID id, String status, String direction, String href) {}

  public record GrnItem(UUID id, String receiptNumber, String status, String href) {}

  public record StockSources(String stock, String transfers, String grn) {}

  public record AccountantDesk(
      long receivablesTotalPaise,
      long payablesTotalPaise,
      long expenseTotalPaise,
      List<BucketItem> receivableBuckets,
      BooksSources sources) {}

  public record BucketItem(String key, String label, long totalPaise) {}

  public record BooksSources(String aging, String expenses) {}

  public record OwnerDesk(
      long todaySalesPaise,
      int todayBillCount,
      List<BranchSales> branches,
      long receivablesTotalPaise,
      long payablesTotalPaise,
      long expenseTotalPaise,
      int lowStockCount,
      OwnerSources sources) {}

  public record BranchSales(UUID id, String name, long todaySalesPaise) {}

  public record OwnerSources(String sales, String stock, String aging, String expenses) {}
}
