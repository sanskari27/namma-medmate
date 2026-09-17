package com.nammamedmate.server.application.customercredit;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record CustomerCreditOutstandingView(
    Summary summary,
    List<AgingBand> aging,
    List<OutstandingItem> items,
    List<PaymentItem> payments) {

  public record Summary(
      long totalOutstandingPaise,
      int outstandingAccountCount,
      long overduePaise,
      int overdueAccountCount,
      long collectedThisMonthPaise,
      int collectionRatePercent,
      long creditGivenAllTimePaise,
      int khataAccountCount) {}

  public record AgingBand(String key, String label, long totalPaise, int accountCount) {}

  public record OutstandingItem(
      UUID customerId,
      String customerName,
      String customerPhone,
      long limitPaise,
      long balancePaise,
      long availablePaise,
      long version,
      int billCount,
      long givenPaise,
      long repaidPaise,
      int ageDays) {}

  public record PaymentItem(
      UUID id,
      UUID customerId,
      String customerName,
      long amountPaise,
      String mode,
      String reference,
      String receiptLabel,
      Instant occurredAt) {}
}
