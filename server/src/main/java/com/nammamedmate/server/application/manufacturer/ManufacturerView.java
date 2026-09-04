package com.nammamedmate.server.application.manufacturer;

import java.time.Instant;
import java.util.UUID;

public record ManufacturerView(
    UUID id, UUID tenantId, String name, Instant createdAt, Instant updatedAt) {}
