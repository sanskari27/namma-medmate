package com.nammamedmate.server.application.inventory;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record StockTransferView(
    UUID id,
    UUID fromBranchId,
    UUID toBranchId,
    String direction,
    String status,
    List<StockTransferLineView> lines,
    long version,
    Instant createdAt,
    Instant updatedAt) {}
