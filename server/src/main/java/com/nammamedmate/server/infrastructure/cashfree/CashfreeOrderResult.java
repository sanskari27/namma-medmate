package com.nammamedmate.server.infrastructure.cashfree;

public record CashfreeOrderResult(String orderId, String paymentSessionId, String checkoutUrl) {}
