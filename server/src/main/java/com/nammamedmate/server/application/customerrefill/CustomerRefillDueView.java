package com.nammamedmate.server.application.customerrefill;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

public record CustomerRefillDueView(List<DueItem> items) {

  public record DueItem(
      UUID refillId,
      UUID customerId,
      String customerName,
      String customerPhone,
      String medicineName,
      int intervalDays,
      LocalDate nextDueOn,
      long version) {}
}
