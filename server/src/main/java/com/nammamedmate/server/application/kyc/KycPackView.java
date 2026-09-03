package com.nammamedmate.server.application.kyc;

import com.nammamedmate.server.domain.KycSubmissionStatus;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record KycPackView(
    UUID id,
    UUID tenantId,
    String tenantName,
    String legalName,
    String drugLicenseNumber,
    String pan,
    String gstin,
    String addressLine1,
    String city,
    String state,
    String pincode,
    String contactPhone,
    KycSubmissionStatus status,
    String rejectionReason,
    Instant submittedAt,
    UUID reviewedBy,
    Instant reviewedAt,
    int version,
    List<KycDocumentView> documents) {}
