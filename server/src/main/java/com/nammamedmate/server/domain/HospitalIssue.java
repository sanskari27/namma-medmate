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
@Table(name = "hospital_issue")
@Getter
@Setter
public class HospitalIssue {

  @Id private UUID id;

  @Column(name = "tenant_id", nullable = false)
  private UUID tenantId;

  @Column(name = "branch_id", nullable = false)
  private UUID branchId;

  @Column(name = "invoice_number", nullable = false, length = 64)
  private String invoiceNumber;

  @Column(name = "ward_id", nullable = false)
  private UUID wardId;

  @Column(name = "indent_id")
  private UUID indentId;

  @Enumerated(EnumType.STRING)
  @Column(nullable = false, length = 32)
  private HospitalIssueReason reason;

  @Column(length = 32)
  private String uhid;

  @Column(name = "patient_name", length = 200)
  private String patientName;

  @Column(name = "pharmacy_name", nullable = false, length = 200)
  private String pharmacyName;

  @Column(name = "pharmacy_address", length = 500)
  private String pharmacyAddress;

  @Column(name = "pharmacy_gstin", length = 20)
  private String pharmacyGstin;

  @Column(name = "pharmacy_drug_license", length = 64)
  private String pharmacyDrugLicense;

  @Column(name = "hospital_name", nullable = false, length = 200)
  private String hospitalName;

  @Column(name = "hospital_gstin", length = 20)
  private String hospitalGstin;

  @Enumerated(EnumType.STRING)
  @Column(name = "credit_terms", nullable = false, length = 32)
  private HospitalCreditTerms creditTerms;

  @Column(name = "mrp_value_paise", nullable = false)
  private long mrpValuePaise;

  @Column(name = "billed_paise", nullable = false)
  private long billedPaise;

  @Column(name = "issued_at", nullable = false)
  private Instant issuedAt;

  @Column(name = "idempotency_key", nullable = false, length = 80)
  private String idempotencyKey;

  @Column(nullable = false)
  private long version;

  @Column(name = "created_at", nullable = false)
  private Instant createdAt;

  @Column(name = "updated_at", nullable = false)
  private Instant updatedAt;
}
