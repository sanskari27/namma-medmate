package com.nammamedmate.server.application.purchaseorder;

import com.nammamedmate.server.domain.PlanCode;
import java.util.List;
import java.util.UUID;

public record ReorderDraftResult(
    String fingerprint,
    PlanCode planCode,
    List<PurchaseOrderView> drafts,
    List<UnmappedLine> unmapped) {

  public record UnmappedLine(
      UUID productId, String sku, String name, int suggestedOrderQty, String reason) {}
}
