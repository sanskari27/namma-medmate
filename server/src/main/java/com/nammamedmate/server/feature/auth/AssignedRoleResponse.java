package com.nammamedmate.server.feature.auth;

import java.util.UUID;

public record AssignedRoleResponse(UUID id, String name, String code, String kind) {}
