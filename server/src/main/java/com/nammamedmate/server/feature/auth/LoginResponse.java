package com.nammamedmate.server.feature.auth;

import java.util.List;
import java.util.UUID;

public record LoginResponse(
    UUID userId,
    String displayName,
    String role,
    UUID tenantId,
    boolean pinSet,
    boolean mustChangePassword,
    List<AssignedRoleResponse> roles,
    List<String> modules) {}
