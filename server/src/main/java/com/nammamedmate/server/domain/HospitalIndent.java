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
@Table(name = "hospital_indent")
@Getter
@Setter
public class HospitalIndent {

  @Id private UUID id;

  @Column(name = "tenant_id", nullable = false)
  private UUID tenantId;

  @Column(name = "branch_id", nullable = false)
  private UUID branchId;

  @Column(name = "indent_number", nullable = false, length = 32)
  private String indentNumber;

  @Column(name = "ward_id", nullable = false)
  private UUID wardId;

  @Column(name = "bed_id")
  private UUID bedId;

  @Column(name = "patient_name", length = 200)
  private String patientName;

  @Column(length = 500)
  private String note;

  @Column(name = "requested_by", nullable = false, length = 200)
  private String requestedBy;

  @Column(name = "requested_at", nullable = false)
  private Instant requestedAt;

  @Enumerated(EnumType.STRING)
  @Column(nullable = false, length = 16)
  private HospitalIndentStatus status;

  @Column(name = "hospital_invoice_ref", length = 64)
  private String hospitalInvoiceRef;

  @Column(name = "issued_at")
  private Instant issuedAt;

  @Column(nullable = false)
  private long version;

  @Column(name = "created_at", nullable = false)
  private Instant createdAt;

  @Column(name = "updated_at", nullable = false)
  private Instant updatedAt;
}
