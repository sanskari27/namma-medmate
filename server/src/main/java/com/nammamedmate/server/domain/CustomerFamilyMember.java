package com.nammamedmate.server.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;
import lombok.Getter;
import lombok.Setter;

@Entity
@Table(name = "customer_family_member")
@Getter
@Setter
public class CustomerFamilyMember {

  @Id private UUID id;

  @Column(name = "tenant_id", nullable = false)
  private UUID tenantId;

  @Column(name = "family_id", nullable = false)
  private UUID familyId;

  @Column(name = "customer_id", nullable = false)
  private UUID customerId;

  @Column(length = 64)
  private String relationship;

  @Column(name = "created_at", nullable = false)
  private Instant createdAt;
}
