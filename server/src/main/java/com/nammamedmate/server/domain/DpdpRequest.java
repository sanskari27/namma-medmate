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
@Table(name = "dpdp_request")
@Getter
@Setter
public class DpdpRequest {

  @Id private UUID id;

  @Column(name = "tenant_id")
  private UUID tenantId;

  @Enumerated(EnumType.STRING)
  @Column(name = "principal_type", nullable = false, length = 32)
  private DpdpPrincipalType principalType;

  @Column(name = "principal_id")
  private UUID principalId;

  @Enumerated(EnumType.STRING)
  @Column(name = "request_type", nullable = false, length = 32)
  private DpdpRequestType requestType;

  @Enumerated(EnumType.STRING)
  @Column(nullable = false, length = 16)
  private DpdpRequestStatus status;

  @Column(name = "submitted_name", length = 200)
  private String submittedName;

  @Column(name = "submitted_phone", length = 32)
  private String submittedPhone;

  @Column(length = 500)
  private String notes;

  @Column(name = "identity_method", length = 500)
  private String identityMethod;

  @Column(name = "identity_attested_by")
  private UUID identityAttestedBy;

  @Column(name = "identity_attested_at")
  private Instant identityAttestedAt;

  @Column(name = "accepted_at")
  private Instant acceptedAt;

  @Column(name = "deadline_at")
  private Instant deadlineAt;

  @Column(length = 16)
  private String decision;

  @Column(name = "decision_reason", length = 500)
  private String decisionReason;

  @Column(name = "legal_retention", nullable = false)
  private boolean legalRetention;

  @Column(name = "export_json", columnDefinition = "TEXT")
  private String exportJson;

  @Column(name = "created_by", nullable = false)
  private UUID createdBy;

  @Column(nullable = false)
  private int version = 1;

  @Column(name = "created_at", nullable = false)
  private Instant createdAt;

  @Column(name = "updated_at", nullable = false)
  private Instant updatedAt;
}
