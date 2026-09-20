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
@Table(name = "hospital_admission")
@Getter
@Setter
public class HospitalAdmission {

  @Id private UUID id;

  @Column(name = "tenant_id", nullable = false)
  private UUID tenantId;

  @Column(name = "branch_id", nullable = false)
  private UUID branchId;

  @Column(nullable = false, length = 32)
  private String uhid;

  @Column(name = "patient_name", nullable = false, length = 200)
  private String patientName;

  @Column(length = 32)
  private String phone;

  private Integer age;

  @Column(length = 32)
  private String gender;

  @Column(name = "customer_id")
  private UUID customerId;

  @Column(name = "ward_id", nullable = false)
  private UUID wardId;

  @Column(name = "bed_id", nullable = false)
  private UUID bedId;

  @Column(name = "attending_doctor_id")
  private UUID attendingDoctorId;

  @Column(length = 500)
  private String diagnosis;

  @Enumerated(EnumType.STRING)
  @Column(name = "payer_type", nullable = false, length = 16)
  private HospitalPayerType payerType;

  @Column(name = "insurer_name", length = 200)
  private String insurerName;

  @Column(name = "policy_number", length = 64)
  private String policyNumber;

  @Enumerated(EnumType.STRING)
  @Column(nullable = false, length = 16)
  private HospitalAdmissionStatus status;

  @Column(name = "admitted_at", nullable = false)
  private Instant admittedAt;

  @Column(nullable = false)
  private long version;

  @Column(name = "created_at", nullable = false)
  private Instant createdAt;

  @Column(name = "updated_at", nullable = false)
  private Instant updatedAt;
}
