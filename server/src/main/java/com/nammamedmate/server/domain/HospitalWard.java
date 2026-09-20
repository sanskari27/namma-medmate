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
@Table(name = "hospital_ward")
@Getter
@Setter
public class HospitalWard {

  @Id private UUID id;

  @Column(name = "tenant_id", nullable = false)
  private UUID tenantId;

  @Column(name = "branch_id", nullable = false)
  private UUID branchId;

  @Column(nullable = false, length = 200)
  private String name;

  @Column(nullable = false, length = 32)
  private String code;

  @Column(length = 64)
  private String floor;

  @Enumerated(EnumType.STRING)
  @Column(nullable = false, length = 32)
  private HospitalWardCategory category;

  @Column(nullable = false)
  private int capacity;

  @Column(name = "nurse_in_charge", length = 200)
  private String nurseInCharge;

  @Column(nullable = false)
  private long version;

  @Column(name = "created_at", nullable = false)
  private Instant createdAt;

  @Column(name = "updated_at", nullable = false)
  private Instant updatedAt;
}
