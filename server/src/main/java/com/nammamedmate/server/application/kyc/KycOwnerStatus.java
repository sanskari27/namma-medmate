package com.nammamedmate.server.application.kyc;

import com.nammamedmate.server.domain.KycSubmissionStatus;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record KycOwnerStatus(
    UUID tenantId,
    String tenantStatus,
    boolean emailVerified,
    KycSubmissionStatus status,
    String rejectionReason,
    Instant submittedAt,
    Instant reviewedAt,
    UUID submissionId,
    List<KycDocumentView> documents) {}
