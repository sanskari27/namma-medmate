package com.nammamedmate.server.feature.tenant;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record AdminTenantResponse(
    UUID id,
    String name,
    String slug,
    String status,
    Instant updatedAt,
    List<String> allowedTransitions) {}
