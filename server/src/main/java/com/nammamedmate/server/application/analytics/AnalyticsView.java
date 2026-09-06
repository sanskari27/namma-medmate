package com.nammamedmate.server.application.analytics;

import com.fasterxml.jackson.annotation.JsonInclude;
import java.util.List;
import java.util.UUID;

@JsonInclude(JsonInclude.Include.NON_NULL)
public record AnalyticsView(
    String compare,
    String from,
    String to,
    String priorFrom,
    String priorTo,
    String scope,
    UUID branchId,
    String branchName,
    PeriodTotals current,
    PeriodTotals prior,
    PeriodDelta delta,
    SalesTrendChart salesTrend,
    List<TopSellerItem> topSellers,
    List<SlowDeadItem> slowDeadStock,
    List<FrequencyBucket> customerFrequency) {

  public record PeriodTotals(long salesPaise, int billCount, long unitsSold) {}

  public record PeriodDelta(long salesPaise, Integer salesPctBps) {}

  public record SalesTrendChart(List<TrendPoint> points) {}

  public record TrendPoint(String date, long currentPaise, long priorPaise) {}

  public record TopSellerItem(
      UUID productId, String name, String sku, long units, long salesPaise) {}

  public record SlowDeadItem(
      UUID productId,
      String name,
      String sku,
      String classification,
      String onHand,
      long unitsSold) {}

  public record FrequencyBucket(String bucket, int currentCount, int priorCount) {}
}
