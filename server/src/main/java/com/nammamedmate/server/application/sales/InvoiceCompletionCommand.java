package com.nammamedmate.server.application.sales;

import com.nammamedmate.server.domain.PaymentMode;
import java.util.List;

public record InvoiceCompletionCommand(
    Integer expectedVersion,
    Long expectedTotalPaise,
    Long changePaise,
    String idempotencyKey,
    List<Payment> payments) {

  public record Payment(PaymentMode mode, Long amountPaise, String reference) {}
}
