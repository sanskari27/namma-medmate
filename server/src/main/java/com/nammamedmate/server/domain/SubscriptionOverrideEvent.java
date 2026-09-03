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
@Table(name = "subscription_override_event")
@Getter
@Setter
public class SubscriptionOverrideEvent {

  @Id private UUID id;

  @Column(name = "tenant_id", nullable = false)
  private UUID tenantId;

  @Column(name = "actor_user_id", nullable = false)
  private UUID actorUserId;

  @Enumerated(EnumType.STRING)
  @Column(name = "before_plan", nullable = false, length = 32)
  private PlanCode beforePlan;

  @Enumerated(EnumType.STRING)
  @Column(name = "after_plan", nullable = false, length = 32)
  private PlanCode afterPlan;

  @Enumerated(EnumType.STRING)
  @Column(name = "before_status", nullable = false, length = 32)
  private SubscriptionStatus beforeStatus;

  @Enumerated(EnumType.STRING)
  @Column(name = "after_status", nullable = false, length = 32)
  private SubscriptionStatus afterStatus;

  @Column(name = "before_expires_at")
  private Instant beforeExpiresAt;

  @Column(name = "after_expires_at")
  private Instant afterExpiresAt;

  @Column(name = "before_branch_limit_override")
  private Integer beforeBranchLimitOverride;

  @Column(name = "after_branch_limit_override")
  private Integer afterBranchLimitOverride;

  @Column(nullable = false, length = 1000)
  private String reason;

  @Column(name = "created_at", nullable = false)
  private Instant createdAt;
}
