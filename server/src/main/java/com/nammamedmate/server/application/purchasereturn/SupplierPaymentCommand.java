package com.nammamedmate.server.application.purchasereturn;

public record SupplierPaymentCommand(
    long amountPaise,
    String mode,
    String reference,
    String idempotencyKey,
    Long expectedAccountVersion) {}
