package com.nammamedmate.server.infrastructure.cashfree;

import java.math.BigDecimal;

public record CashfreeOrderStatus(String orderId, String status, BigDecimal amountRupees) {}
