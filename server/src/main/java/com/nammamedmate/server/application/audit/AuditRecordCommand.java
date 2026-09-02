package com.nammamedmate.server.application.audit;

import java.util.UUID;

public record AuditRecordCommand(
    UUID userId,
    UUID tenantId,
    UUID branchId,
    String action,
    String outcome,
    String attemptedIdentity,
    String sourceIp,
    String userAgent,
    UUID sessionId,
    String contextJson) {}
