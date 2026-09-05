package com.nammamedmate.server.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;
import lombok.Getter;
import lombok.Setter;

@Entity
@Table(name = "compliance_license")
@Getter
@Setter
public class ComplianceLicense {

  @Id private UUID id;

  @Column(name = "tenant_id", nullable = false)
  private UUID tenantId;

  @Column(name = "branch_id")
  private UUID branchId;

  @Column(name = "staff_user_id")
  private UUID staffUserId;

  @Enumerated(EnumType.STRING)
  @Column(name = "doc_type", nullable = false, length = 32)
  private ComplianceDocType docType;

  @Enumerated(EnumType.STRING)
  @Column(nullable = false, length = 16)
  private ComplianceLicenseScope scope;

  @Column(name = "license_number", nullable = false, length = 64)
  private String licenseNumber;

  @Column(name = "issued_on", nullable = false)
  private LocalDate issuedOn;

  @Column(name = "expires_on", nullable = false)
  private LocalDate expiresOn;

  @Column(name = "current_evidence_id")
  private UUID currentEvidenceId;

  @Column(nullable = false)
  private int version = 1;

  @Column(name = "created_at", nullable = false)
  private Instant createdAt;

  @Column(name = "updated_at", nullable = false)
  private Instant updatedAt;
}
