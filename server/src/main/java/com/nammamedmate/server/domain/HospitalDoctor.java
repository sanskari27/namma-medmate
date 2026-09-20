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
@Table(name = "hospital_doctor")
@Getter
@Setter
public class HospitalDoctor {

  @Id private UUID id;

  @Column(name = "tenant_id", nullable = false)
  private UUID tenantId;

  @Column(name = "doctor_id", nullable = false)
  private UUID doctorId;

  @Column(name = "department_id")
  private UUID departmentId;

  @Column(length = 200)
  private String qualification;

  @Column(length = 200)
  private String specialty;

  @Column(length = 32)
  private String gender;

  @Column(name = "experience_years")
  private Integer experienceYears;

  @Column(length = 320)
  private String email;

  @Column(name = "opd_room", length = 64)
  private String opdRoom;

  @Column(name = "consulting_days", length = 200)
  private String consultingDays;

  @Column(name = "consulting_hours", length = 200)
  private String consultingHours;

  @Column(name = "consultation_fee_paise", nullable = false)
  private long consultationFeePaise;

  @Enumerated(EnumType.STRING)
  @Column(nullable = false, length = 16)
  private HospitalDoctorStatus status;

  @Column(length = 500)
  private String languages;

  @Column(columnDefinition = "TEXT")
  private String notes;

  @Column(nullable = false)
  private long version;

  @Column(name = "created_at", nullable = false)
  private Instant createdAt;

  @Column(name = "updated_at", nullable = false)
  private Instant updatedAt;
}
