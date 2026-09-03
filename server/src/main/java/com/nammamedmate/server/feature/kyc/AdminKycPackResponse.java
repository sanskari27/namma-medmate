package com.nammamedmate.server.feature.kyc;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record AdminKycPackResponse(
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
    String status,
    String rejectionReason,
    Instant submittedAt,
    UUID reviewedBy,
    Instant reviewedAt,
    int version,
    List<AdminKycDocumentResponse> documents) {}
