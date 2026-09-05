package com.nammamedmate.server.domain;

import java.util.List;

public enum ComplianceReportKey {
  H1_SALES("Schedule H1 Sale Register", List.of("from", "to", "productId")),
  PURCHASE("Purchase Register", List.of("from", "to", "supplierId")),
  PURCHASE_INVOICE("Purchase Invoice/Cash Memo Records", List.of("from", "to", "supplierId")),
  SUPPLIER_LICENSE("Supplier Drug License Records", List.of()),
  LICENSE_EXPIRY("Drug License Renewal/Expiry Records", List.of()),
  CONTROLLED_STOCK("Controlled/Restricted Drug Stock Register", List.of("from", "to", "productId")),
  BATCH_STOCK("Batch-wise Stock Register", List.of("productId")),
  EXPIRED("Expired Medicine Register", List.of("productId")),
  DAMAGED("Damaged Medicine Register", List.of("from", "to", "productId")),
  SUPPLIER_RETURN("Drug Return-to-Supplier Records", List.of("from", "to", "supplierId")),
  STOCK_LOSS("Stock Adjustment/Stock Loss Records", List.of("from", "to", "productId")),
  STOCK_VERIFICATION(
      "Stock Verification/Physical Inventory Records", List.of("from", "to", "productId")),
  NEAR_EXPIRY("Expiry/Near-Expiry Reports", List.of("productId")),
  TRACEABILITY("Batch Traceability Reports", List.of("from", "to", "batchNumber")),
  SUPPLIER_PURCHASE("Supplier-wise Purchase Reports", List.of("from", "to", "supplierId")),
  PRODUCT_TRACE(
      "Product-wise Purchase/Sale Traceability Reports", List.of("from", "to", "productId"));

  private final String title;
  private final List<String> filters;

  ComplianceReportKey(String title, List<String> filters) {
    this.title = title;
    this.filters = filters;
  }

  public String title() {
    return title;
  }

  public List<String> filters() {
    return filters;
  }
}
