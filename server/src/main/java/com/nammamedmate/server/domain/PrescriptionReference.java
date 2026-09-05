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
@Table(name = "prescription_reference")
@Getter
@Setter
public class PrescriptionReference {

  @Id private UUID id;

  @Column(name = "tenant_id", nullable = false)
  private UUID tenantId;

  @Column(name = "branch_id", nullable = false)
  private UUID branchId;

  @Column(name = "customer_id", nullable = false)
  private UUID customerId;

  @Column(name = "doctor_id")
  private UUID doctorId;

  @Column(name = "prescription_reference", nullable = false, length = 64)
  private String prescriptionReference;

  @Column(name = "issued_at", nullable = false)
  private Instant issuedAt;

  @Column(name = "expires_at", nullable = false)
  private Instant expiresAt;

  @Enumerated(EnumType.STRING)
  @Column(nullable = false, length = 16)
  private PrescriptionReferenceStatus status;

  @Enumerated(EnumType.STRING)
  @Column(name = "archive_reason", length = 16)
  private PrescriptionReferenceArchiveReason archiveReason;

  @Column(name = "archived_at")
  private Instant archivedAt;

  @Column(name = "first_invoice_id")
  private UUID firstInvoiceId;

  @Column(nullable = false)
  private int version;

  @Column(name = "created_at", nullable = false)
  private Instant createdAt;

  @Column(name = "updated_at", nullable = false)
  private Instant updatedAt;
}
