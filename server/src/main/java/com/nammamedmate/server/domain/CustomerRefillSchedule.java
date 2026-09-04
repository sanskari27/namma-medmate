package com.nammamedmate.server.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;
import lombok.Getter;
import lombok.Setter;

@Entity
@Table(name = "customer_refill_schedule")
@Getter
@Setter
public class CustomerRefillSchedule {

  @Id private UUID id;

  @Column(name = "tenant_id", nullable = false)
  private UUID tenantId;

  @Column(name = "customer_id", nullable = false)
  private UUID customerId;

  @Column(name = "medicine_name", nullable = false, length = 200)
  private String medicineName;

  @Column(name = "interval_days", nullable = false)
  private int intervalDays;

  @Column(name = "next_due_on", nullable = false)
  private LocalDate nextDueOn;

  @Column(nullable = false)
  private long version;

  @Column(name = "created_at", nullable = false)
  private Instant createdAt;

  @Column(name = "updated_at", nullable = false)
  private Instant updatedAt;
}
