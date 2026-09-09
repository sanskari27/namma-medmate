package com.nammamedmate.server.application.customer;

import java.time.Instant;
import java.util.UUID;

public record CustomerDirectoryPurchaseView(
    UUID invoiceId,
    String invoiceNumber,
    long amountPaise,
    String itemSummary,
    String paymentLabel,
    Instant occurredAt) {}
