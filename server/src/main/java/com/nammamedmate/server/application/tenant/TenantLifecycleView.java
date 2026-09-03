package com.nammamedmate.server.application.tenant;

import com.nammamedmate.server.domain.TenantStatus;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record TenantLifecycleView(
    UUID id,
    String name,
    String slug,
    TenantStatus status,
    Instant updatedAt,
    List<TenantStatus> allowedTransitions) {}
