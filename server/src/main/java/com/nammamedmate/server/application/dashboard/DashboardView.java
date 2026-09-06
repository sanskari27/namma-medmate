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
      UUID productId,
      String sku,
      String productName,
      BigDecimal onHand,
      Integer reorderLevel,
      UUID branchId,
      String branchName) {}

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
      Instant asOf,
      long todaySalesPaise,
      int todayBillCount,
      List<BranchSales> branches,
      long receivablesTotalPaise,
      long payablesTotalPaise,
      long expenseTotalPaise,
      int lowStockCount,
      OwnerSources sources,
      DashboardWidget<SalesPayload> sales,
      DashboardWidget<CountItemsPayload<LowStockItem>> lowStock,
      DashboardWidget<CountItemsPayload<ExpiryItem>> expiry,
      DashboardWidget<CountItemsPayload<WorkItem>> approvals,
      DashboardWidget<AgingPayload> receivables,
      DashboardWidget<AgingPayload> payables,
      DashboardWidget<CountItemsPayload<TopProductItem>> topProducts,
      DashboardWidget<CountItemsPayload<TransferItem>> transfers,
      DashboardWidget<CompliancePayload> compliance,
      DashboardWidget<CountItemsPayload<WorkItem>> openPurchaseOrders) {}

  public record SalesPayload(
      long todaySalesPaise, int todayBillCount, List<BranchSales> branches) {}

  public record CountItemsPayload<T>(int count, List<T> items) {}

  public record ExpiryItem(
      UUID productId,
      String sku,
      String productName,
      String batchNumber,
      LocalDate expiresOn,
      BigDecimal quantity,
      UUID branchId,
      String branchName) {}

  public record WorkItem(UUID id, String label, String status, String href) {}

  public record AgingPayload(long totalPaise, List<BucketItem> buckets) {}

  public record TopProductItem(
      UUID productId, String sku, String productName, BigDecimal quantity, long salesPaise) {}

  public record CompliancePayload(
      String tenantStatus, String kycStatus, int licenseDueCount, List<LicenseDueItem> licenses) {}

  public record LicenseDueItem(
      UUID id, String docType, LocalDate expiresOn, UUID branchId, String href) {}

  public record BranchSales(UUID id, String name, long todaySalesPaise) {}

  public record OwnerSources(String sales, String stock, String aging, String expenses) {}
}
