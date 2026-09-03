package com.nammamedmate.server.application.subscription;

import com.nammamedmate.server.domain.PlanCode;
import com.nammamedmate.server.domain.SubscriptionStatus;
import java.time.Instant;
import java.util.UUID;

public record TenantSubscriptionSummary(
    UUID tenantId,
    String tenantName,
    PlanCode planCode,
    SubscriptionStatus status,
    Instant expiresAt,
    Integer branchLimitOverride,
    int effectiveBranchLimit,
    int maxUsers,
    long usersUsed,
    long branchesUsed) {}
