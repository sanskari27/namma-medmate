package com.nammamedmate.server.application.subscription;

import com.nammamedmate.server.domain.PlanCode;
import com.nammamedmate.server.domain.SubscriptionStatus;
import java.time.Instant;
import java.util.UUID;

public record OverrideEventView(
    UUID id,
    UUID tenantId,
    UUID actorUserId,
    PlanCode beforePlan,
    PlanCode afterPlan,
    SubscriptionStatus beforeStatus,
    SubscriptionStatus afterStatus,
    Instant beforeExpiresAt,
    Instant afterExpiresAt,
    Integer beforeBranchLimitOverride,
    Integer afterBranchLimitOverride,
    String reason,
    Instant createdAt) {}
