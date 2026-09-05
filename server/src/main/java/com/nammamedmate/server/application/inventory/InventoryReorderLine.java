package com.nammamedmate.server.application.inventory;

import java.math.BigDecimal;
import java.util.UUID;

public record InventoryReorderLine(
    UUID productId,
    String sku,
    String name,
    BigDecimal onHand,
    Integer reorderLevel,
    Integer minimumStock,
    Integer reorderQuantity,
    int suggestedOrderQty) {}
