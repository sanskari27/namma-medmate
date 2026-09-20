package com.nammamedmate.server.application.hospital;

public record HospitalPaymentCommand(
    long amountPaise,
    String mode,
    String reference,
    String idempotencyKey,
    Long expectedAccountVersion) {}
