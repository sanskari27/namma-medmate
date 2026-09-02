package com.nammamedmate.server.application.auth;

import com.nammamedmate.server.domain.AppUserRole;
import java.util.UUID;

public record AuthenticatedUser(
    UUID userId, String displayName, AppUserRole role, UUID tenantId, boolean pinSet) {}
