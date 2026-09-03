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
@Table(name = "customer")
@Getter
@Setter
public class Customer {

  @Id private UUID id;

  @Column(name = "tenant_id", nullable = false)
  private UUID tenantId;

  @Column(nullable = false, length = 200)
  private String name;

  @Column(nullable = false, length = 32)
  private String phone;

  @Column(length = 255)
  private String email;

  @Column(name = "date_of_birth")
  private LocalDate dateOfBirth;

  @Column(length = 32)
  private String gender;

  @Column(length = 500)
  private String address;

  @Column(name = "blood_group", length = 16)
  private String bloodGroup;

  @Column(columnDefinition = "TEXT")
  private String allergies;

  @Column(name = "chronic_conditions", columnDefinition = "TEXT")
  private String chronicConditions;

  @Column(name = "created_at", nullable = false)
  private Instant createdAt;

  @Column(name = "updated_at", nullable = false)
  private Instant updatedAt;

  @Column(name = "deleted_at")
  private Instant deletedAt;

  @Column(name = "merged_into_id")
  private UUID mergedIntoId;

  @Column(name = "merged_at")
  private Instant mergedAt;

  @Column(name = "merged_by_user_id")
  private UUID mergedByUserId;
}
