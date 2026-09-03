package com.nammamedmate.server.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.Version;
import java.time.Instant;
import java.util.UUID;
import lombok.Getter;
import lombok.Setter;

@Entity
@Table(name = "kyc_submission")
@Getter
@Setter
public class KycSubmission {

  @Id private UUID id;

  @Column(name = "tenant_id", nullable = false)
  private UUID tenantId;

  @Column(name = "legal_name", nullable = false)
  private String legalName;

  @Column(name = "drug_license_number", nullable = false, length = 64)
  private String drugLicenseNumber;

  @Column(nullable = false, length = 20)
  private String pan;

  @Column(length = 20)
  private String gstin;

  @Column(name = "address_line1", nullable = false)
  private String addressLine1;

  @Column(nullable = false, length = 100)
  private String city;

  @Column(nullable = false, length = 100)
  private String state;

  @Column(nullable = false, length = 16)
  private String pincode;

  @Column(name = "contact_phone", nullable = false, length = 32)
  private String contactPhone;

  @Enumerated(EnumType.STRING)
  @Column(nullable = false, length = 32)
  private KycSubmissionStatus status = KycSubmissionStatus.SUBMITTED;

  @Column(name = "rejection_reason", length = 1000)
  private String rejectionReason;

  @Column(name = "submitted_by", nullable = false)
  private UUID submittedBy;

  @Column(name = "submitted_at", nullable = false)
  private Instant submittedAt;

  @Column(name = "reviewed_by")
  private UUID reviewedBy;

  @Column(name = "reviewed_at")
  private Instant reviewedAt;

  @Version
  @Column(nullable = false)
  private int version;

  @Column(name = "created_at", nullable = false)
  private Instant createdAt;

  @Column(name = "updated_at", nullable = false)
  private Instant updatedAt;
}
