package com.nammamedmate.server.application.inventory;

public record CreateStockTakeCommand(String idempotencyKey) {}
