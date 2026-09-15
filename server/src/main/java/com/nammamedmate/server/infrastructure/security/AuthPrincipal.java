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
    UUID activeBranchId,
    AppUserRole sessionRole) {

  public AuthPrincipal(UUID userId, UUID tenantId, UUID sessionId, AppUserRole role) {
    this(userId, tenantId, sessionId, role, userId, tenantId, null, null, role);
  }

  public AuthPrincipal(
      UUID userId,
      UUID tenantId,
      UUID sessionId,
      AppUserRole role,
      UUID sessionUserId,
      UUID sessionTenantId,
      UUID actorUserId) {
    this(
        userId, tenantId, sessionId, role, sessionUserId, sessionTenantId, actorUserId, null, role);
  }

  public AuthPrincipal(
      UUID userId,
      UUID tenantId,
      UUID sessionId,
      AppUserRole role,
      UUID sessionUserId,
      UUID sessionTenantId,
      UUID actorUserId,
      AppUserRole sessionRole) {
    this(
        userId,
        tenantId,
        sessionId,
        role,
        sessionUserId,
        sessionTenantId,
        actorUserId,
        null,
        sessionRole);
  }

  public AuthPrincipal withActiveBranchId(UUID branchId) {
    return new AuthPrincipal(
        userId,
        tenantId,
        sessionId,
        role,
        sessionUserId,
        sessionTenantId,
        actorUserId,
        branchId,
        sessionRole);
  }

  public boolean impersonating() {
    return actorUserId != null;
  }

  /** HQ modules authorize the MASTER session owner, not the acting pharmacy user. */
  public AppUserRole hqRole() {
    return sessionRole != null ? sessionRole : role;
  }

  public UUID hqUserId() {
    return sessionUserId != null ? sessionUserId : userId;
  }
}
