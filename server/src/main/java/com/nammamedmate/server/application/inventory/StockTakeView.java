package com.nammamedmate.server.application.inventory;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record StockTakeView(
    UUID id,
    UUID branchId,
    String status,
    UUID startedByUserId,
    UUID postedByUserId,
    UUID cancelledByUserId,
    int version,
    Instant createdAt,
    Instant updatedAt,
    Instant postedAt,
    List<StockTakeLineView> lines) {}
