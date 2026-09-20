package com.nammamedmate.server.application.dpdp;

import com.nammamedmate.server.domain.DpdpPrincipalType;
import com.nammamedmate.server.domain.DpdpRequestStatus;
import com.nammamedmate.server.domain.DpdpRequestType;
import java.time.Instant;
import java.util.UUID;

public record DpdpRequestView(
    UUID id,
    UUID tenantId,
    DpdpPrincipalType principalType,
    UUID principalId,
    DpdpRequestType requestType,
    DpdpRequestStatus status,
    String submittedName,
    String submittedPhone,
    String notes,
    String identityMethod,
    UUID identityAttestedBy,
    Instant identityAttestedAt,
    Instant acceptedAt,
    Instant deadlineAt,
    String decision,
    String decisionReason,
    boolean legalRetention,
    String exportJson,
    UUID createdBy,
    int version,
    Instant createdAt) {}
