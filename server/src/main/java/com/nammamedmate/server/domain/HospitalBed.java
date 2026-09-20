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
@Table(name = "hospital_bed")
@Getter
@Setter
public class HospitalBed {

  @Id private UUID id;

  @Column(name = "tenant_id", nullable = false)
  private UUID tenantId;

  @Column(name = "branch_id", nullable = false)
  private UUID branchId;

  @Column(name = "ward_id", nullable = false)
  private UUID wardId;

  @Column(name = "sequence_no", nullable = false)
  private int sequenceNo;

  @Column(nullable = false, length = 64)
  private String label;

  @Enumerated(EnumType.STRING)
  @Column(name = "occupancy_status", nullable = false, length = 16)
  private HospitalBedOccupancy occupancyStatus;

  @Column(nullable = false)
  private long version;

  @Column(name = "created_at", nullable = false)
  private Instant createdAt;

  @Column(name = "updated_at", nullable = false)
  private Instant updatedAt;
}
