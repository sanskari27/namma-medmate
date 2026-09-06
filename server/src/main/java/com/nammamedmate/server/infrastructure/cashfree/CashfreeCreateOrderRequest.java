package com.nammamedmate.server.infrastructure.cashfree;

import com.nammamedmate.server.domain.PlanCode;
import java.util.UUID;

public record CashfreeCreateOrderRequest(
    String orderId, UUID tenantId, PlanCode planCode, int amountPaise, String returnUrl) {}
