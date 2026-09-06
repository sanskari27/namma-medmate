package com.nammamedmate.server.application.subscription;

import java.math.BigDecimal;
import java.util.UUID;

public record CashfreeCallbackCommand(
    String type,
    String orderId,
    BigDecimal amountRupees,
    String paymentId,
    UUID tenantTag,
    String planTag,
    String rawJson) {}
