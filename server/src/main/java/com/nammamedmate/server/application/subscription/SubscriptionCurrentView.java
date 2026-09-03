package com.nammamedmate.server.application.subscription;

import com.nammamedmate.server.domain.ModuleCode;
import com.nammamedmate.server.domain.PlanCode;
import com.nammamedmate.server.domain.SubscriptionStatus;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record SubscriptionCurrentView(
    UUID tenantId,
    PlanCode planCode,
    SubscriptionStatus status,
    Instant startedAt,
    Instant expiresAt,
    Integer branchLimitOverride,
    int effectiveBranchLimit,
    int maxUsers,
    long usersUsed,
    long branchesUsed,
    List<ModuleCode> entitledModules) {}
