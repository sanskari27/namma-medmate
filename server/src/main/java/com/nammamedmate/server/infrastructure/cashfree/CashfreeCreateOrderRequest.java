package com.nammamedmate.server.infrastructure.cashfree;

import com.nammamedmate.server.domain.PlanCode;
import java.util.UUID;

public record CashfreeCreateOrderRequest(
    String orderId,
    UUID tenantId,
    PlanCode planCode,
    int amountPaise,
    String returnUrl,
    String customerPhone) {

  public CashfreeCreateOrderRequest(
      String orderId, UUID tenantId, PlanCode planCode, int amountPaise, String returnUrl) {
    this(orderId, tenantId, planCode, amountPaise, returnUrl, "9999999999");
  }

  public CashfreeCreateOrderRequest {
    if (customerPhone == null || customerPhone.isBlank()) {
      customerPhone = "9999999999";
    }
  }
}
