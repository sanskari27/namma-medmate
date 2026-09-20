package com.nammamedmate.server.application.hospital;

import java.time.Instant;
import java.util.UUID;

public record HospitalPaymentView(
    UUID id,
    long amountPaise,
    String mode,
    String reference,
    long balancePaise,
    long accountVersion,
    Instant occurredAt) {}
