package com.nammamedmate.server.application.dashboard;

import com.fasterxml.jackson.annotation.JsonInclude;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@JsonInclude(JsonInclude.Include.NON_NULL)
public record HomeDashboardView(
    LocalDate asOf,
    Instant generatedAt,
    String scope,
    UUID branchId,
    String branchName,
    HeroMetrics hero,
    QuickActionCounts quickActions,
    KpiCards kpis,
    AnalyticsPanel analytics,
    List<AttentionItem> attention,
    List<DashboardView.ExpiryItem> expiringSoon,
    List<DashboardView.TopProductItem> topSellers,
    List<RecentTransaction> recentTransactions) {

  public record HeroMetrics(
      long monthSalesPaise,
      long avgBillTodayPaise,
      long itemsSoldToday,
      long duesToCollectPaise,
      int duesCustomerCount) {}

  public record QuickActionCounts(
      int pendingPrescriptions, int lowStockCount, int pendingApprovals, int pendingGrn) {}

  public record KpiCards(
      long todaySalesPaise,
      int todayBillCount,
      long todayOnlineSalesPaise,
      long todayCounterSalesPaise,
      long yesterdaySalesPaise,
      int pendingPrescriptions,
      int stockAlertCount,
      int lowStockCount,
      int expiringCount,
      int heldBillCount,
      int newHeldBillCount) {}

  public record AnalyticsPanel(
      String period,
      long totalSalesPaise,
      int totalBillCount,
      List<ChannelSlice> channelSplit,
      List<PaymentSlice> paymentModes,
      List<CategorySlice> topCategories,
      List<TrendPoint> trend) {}

  public record ChannelSlice(String key, String label, long salesPaise, int billCount) {}

  public record PaymentSlice(String mode, String label, long salesPaise) {}

  public record CategorySlice(UUID categoryId, String name, String icon, long salesPaise) {}

  public record TrendPoint(String date, long salesPaise, int billCount) {}

  public record AttentionItem(
      String id, String kind, String title, String detail, String href, String actionLabel) {}

  public record RecentTransaction(
      UUID id, String invoiceNumber, long totalPaise, Instant completedAt, String customerLabel) {}
}
