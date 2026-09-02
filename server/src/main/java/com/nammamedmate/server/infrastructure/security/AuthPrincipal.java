package com.nammamedmate.server.infrastructure.security;

import com.nammamedmate.server.domain.AppUserRole;
import java.util.UUID;

public record AuthPrincipal(
    UUID userId,
    UUID tenantId,
    UUID sessionId,
    AppUserRole role,
    UUID sessionUserId,
    UUID sessionTenantId,
    UUID actorUserId) {

  public AuthPrincipal(UUID userId, UUID tenantId, UUID sessionId, AppUserRole role) {
    this(userId, tenantId, sessionId, role, userId, tenantId, null);
  }

  public boolean impersonating() {
    return actorUserId != null;
  }
}
