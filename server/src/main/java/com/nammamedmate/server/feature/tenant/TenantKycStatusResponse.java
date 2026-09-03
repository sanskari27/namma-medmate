package com.nammamedmate.server.feature.tenant;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record TenantKycStatusResponse(
    UUID tenantId,
    String tenantStatus,
    boolean emailVerified,
    String status,
    String rejectionReason,
    Instant submittedAt,
    Instant reviewedAt,
    UUID submissionId,
    List<TenantKycDocumentResponse> documents) {}
