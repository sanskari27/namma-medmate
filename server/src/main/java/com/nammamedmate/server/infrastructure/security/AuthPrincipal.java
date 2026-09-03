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
    UUID actorUserId,
    UUID activeBranchId) {

  public AuthPrincipal(UUID userId, UUID tenantId, UUID sessionId, AppUserRole role) {
    this(userId, tenantId, sessionId, role, userId, tenantId, null, null);
  }

  public AuthPrincipal(
      UUID userId,
      UUID tenantId,
      UUID sessionId,
      AppUserRole role,
      UUID sessionUserId,
      UUID sessionTenantId,
      UUID actorUserId) {
    this(userId, tenantId, sessionId, role, sessionUserId, sessionTenantId, actorUserId, null);
  }

  public AuthPrincipal withActiveBranchId(UUID branchId) {
    return new AuthPrincipal(
        userId, tenantId, sessionId, role, sessionUserId, sessionTenantId, actorUserId, branchId);
  }

  public boolean impersonating() {
    return actorUserId != null;
  }
}
