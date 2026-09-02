package com.nammamedmate.server.feature.auth;

import java.util.UUID;

public record ImpersonationResponse(
    UUID originalUserId,
    String originalDisplayName,
    UUID effectiveUserId,
    String effectiveDisplayName,
    String effectiveRole,
    UUID tenantId,
    String tenantName) {}
