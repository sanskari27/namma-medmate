package com.nammamedmate.server.application.subscription;

import com.nammamedmate.server.domain.PlanCode;
import com.nammamedmate.server.domain.SubscriptionPaymentStatus;
import java.time.Instant;
import java.util.UUID;

public record AdminCashfreePaymentView(
    UUID id,
    UUID tenantId,
    String tenantName,
    PlanCode planCode,
    int amountPaise,
    SubscriptionPaymentStatus status,
    String errorCode,
    boolean exception,
    Instant createdAt) {}
