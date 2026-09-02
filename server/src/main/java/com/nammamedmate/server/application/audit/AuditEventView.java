package com.nammamedmate.server.application.audit;

import java.time.Instant;
import java.util.UUID;

public record AuditEventView(
    UUID id,
    UUID userId,
    UUID tenantId,
    UUID branchId,
    String action,
    String outcome,
    String attemptedIdentity,
    String sourceIp,
    String userAgent,
    UUID sessionId,
    String contextJson,
    Instant createdAt) {}
