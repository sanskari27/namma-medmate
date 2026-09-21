package com.nammamedmate.server.application.hospital;

public record HospitalPatientSettleCommand(
    Long expectedVersion,
    String paymentMode,
    String idempotencyKey,
    String insurerName,
    String policyNumber,
    String uhid) {}
