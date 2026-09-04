package com.nammamedmate.server.application.customercredit;

import java.util.List;
import java.util.UUID;

public record CustomerCreditOutstandingView(List<OutstandingItem> items) {

  public record OutstandingItem(
      UUID customerId,
      String customerName,
      String customerPhone,
      long limitPaise,
      long balancePaise,
      long availablePaise,
      long version) {}
}
