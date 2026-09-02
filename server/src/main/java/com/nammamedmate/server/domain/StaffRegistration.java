package com.nammamedmate.server.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;
import lombok.Getter;
import lombok.Setter;

@Entity
@Table(name = "staff_registration")
@Getter
@Setter
public class StaffRegistration {

  @Id private UUID id;

  @Column(name = "tenant_id")
  private UUID tenantId;

  @Column(name = "user_id", nullable = false, unique = true)
  private UUID userId;

  @Enumerated(EnumType.STRING)
  @Column(nullable = false, length = 32)
  private StaffRegistrationKind kind;

  @Column(name = "license_number", length = 64)
  private String licenseNumber;

  @Column(name = "evidence_reference", length = 255)
  private String evidenceReference;

  @Enumerated(EnumType.STRING)
  @Column(nullable = false, length = 32)
  private StaffRegistrationStatus status = StaffRegistrationStatus.PENDING;

  @Column(name = "reviewed_by")
  private UUID reviewedBy;

  @Column(name = "reviewed_at")
  private Instant reviewedAt;

  @Column(name = "created_at", nullable = false)
  private Instant createdAt;
}
