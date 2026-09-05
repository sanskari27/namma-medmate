package com.nammamedmate.server.application.compliance;

import com.nammamedmate.server.domain.ComplianceDocType;
import com.nammamedmate.server.domain.ComplianceLicenseScope;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

public record LicenseView(
    UUID id,
    UUID tenantId,
    UUID branchId,
    UUID staffUserId,
    ComplianceDocType docType,
    ComplianceLicenseScope scope,
    String licenseNumber,
    LocalDate issuedOn,
    LocalDate expiresOn,
    UUID currentEvidenceId,
    int version,
    boolean due,
    List<EvidenceView> evidence) {

  public record EvidenceView(
      UUID id,
      String licenseNumber,
      LocalDate issuedOn,
      LocalDate expiresOn,
      String contentType,
      long byteSize,
      Instant uploadedAt) {}
}
