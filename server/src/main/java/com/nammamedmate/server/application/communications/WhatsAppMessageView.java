package com.nammamedmate.server.application.communications;

import java.time.Instant;
import java.util.UUID;

public record WhatsAppMessageView(
    UUID id,
    UUID tenantId,
    String kind,
    UUID sourceId,
    UUID customerId,
    UUID campaignId,
    String templateUniqueName,
    String namespaceName,
    String preview,
    String status,
    String failureCode,
    String providerMessageId,
    int attemptCount,
    Instant createdAt,
    Instant updatedAt) {}
