package com.nammamedmate.server.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;
import lombok.Getter;
import lombok.Setter;

@Entity
@Table(name = "compliance_license_evidence")
@Getter
@Setter
public class ComplianceLicenseEvidence {

  @Id private UUID id;

  @Column(name = "tenant_id", nullable = false)
  private UUID tenantId;

  @Column(name = "license_id", nullable = false)
  private UUID licenseId;

  @Column(name = "license_number", nullable = false, length = 64)
  private String licenseNumber;

  @Column(name = "issued_on", nullable = false)
  private LocalDate issuedOn;

  @Column(name = "expires_on", nullable = false)
  private LocalDate expiresOn;

  @Column(name = "storage_key", nullable = false, length = 512)
  private String storageKey;

  @Column(name = "content_type", nullable = false, length = 100)
  private String contentType;

  @Column(name = "byte_size", nullable = false)
  private long byteSize;

  @Column(name = "original_filename", nullable = false)
  private String originalFilename;

  @Column(name = "uploaded_by", nullable = false)
  private UUID uploadedBy;

  @Column(name = "uploaded_at", nullable = false)
  private Instant uploadedAt;
}
