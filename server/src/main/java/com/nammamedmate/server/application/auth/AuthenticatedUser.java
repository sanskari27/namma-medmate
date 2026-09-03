package com.nammamedmate.server.application.auth;

import com.nammamedmate.server.domain.AppUserRole;
import com.nammamedmate.server.domain.TenantStatus;
import java.util.UUID;

public record AuthenticatedUser(
    UUID userId,
    String displayName,
    AppUserRole role,
    UUID tenantId,
    boolean pinSet,
    boolean mustChangePassword,
    TenantStatus tenantStatus,
    Boolean emailVerified) {

  public AuthenticatedUser(
      UUID userId,
      String displayName,
      AppUserRole role,
      UUID tenantId,
      boolean pinSet,
      boolean mustChangePassword) {
    this(userId, displayName, role, tenantId, pinSet, mustChangePassword, null, null);
  }
}
