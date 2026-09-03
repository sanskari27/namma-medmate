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
@Table(name = "tenant_subscription")
@Getter
@Setter
public class TenantSubscription {

  @Id private UUID id;

  @Column(name = "tenant_id", nullable = false, unique = true)
  private UUID tenantId;

  @Enumerated(EnumType.STRING)
  @Column(name = "plan_code", nullable = false, length = 32)
  private PlanCode planCode;

  @Enumerated(EnumType.STRING)
  @Column(nullable = false, length = 32)
  private SubscriptionStatus status = SubscriptionStatus.ACTIVE;

  @Column(name = "started_at", nullable = false)
  private Instant startedAt;

  @Column(name = "expires_at")
  private Instant expiresAt;

  @Column(name = "created_at", nullable = false)
  private Instant createdAt;

  @Column(name = "updated_at", nullable = false)
  private Instant updatedAt;
}
