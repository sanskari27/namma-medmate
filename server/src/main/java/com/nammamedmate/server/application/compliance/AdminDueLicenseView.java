package com.nammamedmate.server.application.compliance;

import com.nammamedmate.server.domain.ComplianceDocType;
import com.nammamedmate.server.domain.ComplianceLicenseScope;
import java.time.LocalDate;
import java.util.UUID;

public record AdminDueLicenseView(
    UUID id,
    UUID tenantId,
    String tenantName,
    UUID branchId,
    String branchName,
    UUID staffUserId,
    String staffDisplayName,
    ComplianceDocType docType,
    ComplianceLicenseScope scope,
    String licenseNumber,
    LocalDate issuedOn,
    LocalDate expiresOn,
    boolean due) {}
