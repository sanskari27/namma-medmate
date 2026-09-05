package com.nammamedmate.server.application.purchaseorder;

import com.nammamedmate.server.domain.PurchaseOrderStatus;
import java.time.Instant;
import java.util.Map;
import java.util.UUID;

public record PurchaseOrderVersionView(
    int version,
    Instant createdAt,
    UUID changedByUserId,
    PurchaseOrderStatus status,
    long totalPaise,
    Map<String, Object> snapshot) {}
