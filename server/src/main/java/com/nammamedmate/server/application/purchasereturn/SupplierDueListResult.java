package com.nammamedmate.server.application.purchasereturn;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

public record SupplierDueListResult(List<DueItem> items) {

  public record DueItem(
      UUID supplierId, String legalName, long balancePaise, LocalDate dueOn, boolean overdue) {}
}
