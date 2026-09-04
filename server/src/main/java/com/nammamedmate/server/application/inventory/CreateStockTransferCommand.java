package com.nammamedmate.server.application.inventory;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

public record CreateStockTransferCommand(
    String direction, UUID counterpartyBranchId, List<Line> lines, String idempotencyKey) {

  public record Line(UUID productId, UUID batchId, BigDecimal quantity) {}
}
