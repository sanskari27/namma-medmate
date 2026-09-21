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
@Table(name = "hospital_patient_settlement")
@Getter
@Setter
public class HospitalPatientSettlement {

  @Id private UUID id;

  @Column(name = "tenant_id", nullable = false)
  private UUID tenantId;

  @Column(name = "branch_id", nullable = false)
  private UUID branchId;

  @Column(name = "admission_id")
  private UUID admissionId;

  @Column(nullable = false, length = 32)
  private String uhid;

  @Enumerated(EnumType.STRING)
  @Column(name = "payment_mode", nullable = false, length = 16)
  private PaymentMode paymentMode;

  @Column(name = "amount_paise", nullable = false)
  private long amountPaise;

  @Column(name = "insurer_name", length = 200)
  private String insurerName;

  @Column(name = "policy_number", length = 64)
  private String policyNumber;

  @Column(name = "idempotency_key", nullable = false, length = 128)
  private String idempotencyKey;

  @Column(name = "created_by", nullable = false)
  private UUID createdBy;

  @Column(name = "created_at", nullable = false)
  private Instant createdAt;
}
