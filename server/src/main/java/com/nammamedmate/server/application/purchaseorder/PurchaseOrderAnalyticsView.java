package com.nammamedmate.server.application.purchaseorder;

import java.util.List;
import java.util.UUID;

public record PurchaseOrderAnalyticsView(long totalSpendPaise, List<SupplierSpend> suppliers) {

  public record SupplierSpend(
      UUID supplierId, String supplierLegalName, long orderCount, long spendPaise) {}
}
