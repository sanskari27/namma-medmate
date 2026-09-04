package com.nammamedmate.server.application.productcategory;

import java.time.Instant;
import java.util.UUID;

public record ProductCategoryView(
    UUID id, UUID tenantId, String name, Instant createdAt, Instant updatedAt) {}
