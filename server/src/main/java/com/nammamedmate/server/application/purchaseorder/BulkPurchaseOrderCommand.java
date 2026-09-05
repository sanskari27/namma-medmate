package com.nammamedmate.server.application.purchaseorder;

import java.util.List;
import java.util.UUID;

public record BulkPurchaseOrderCommand(String action, List<Item> items) {

  public record Item(UUID id, Integer expectedVersion) {}
}
