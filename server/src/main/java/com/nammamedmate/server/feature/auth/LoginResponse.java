package com.nammamedmate.server.feature.auth;

import java.util.UUID;

public record LoginResponse(UUID userId, String displayName, String role, UUID tenantId) {}
