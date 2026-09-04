package com.nammamedmate.server.application.inventory;

public record BranchStockLevelView(
    Integer reorderLevel, Integer reorderQuantity, Integer minimumStock) {}
