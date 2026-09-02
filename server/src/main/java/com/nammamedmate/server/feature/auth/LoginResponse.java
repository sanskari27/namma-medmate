package com.nammamedmate.server.feature.auth;

import com.fasterxml.jackson.annotation.JsonInclude;
import java.util.List;
import java.util.UUID;

@JsonInclude(JsonInclude.Include.NON_NULL)
public record LoginResponse(
    UUID userId,
    String displayName,
    String role,
    UUID tenantId,
    boolean pinSet,
    boolean mustChangePassword,
    List<AssignedRoleResponse> roles,
    List<String> modules,
    ImpersonationResponse impersonation) {

  public LoginResponse(
      UUID userId,
      String displayName,
      String role,
      UUID tenantId,
      boolean pinSet,
      boolean mustChangePassword,
      List<AssignedRoleResponse> roles,
      List<String> modules) {
    this(userId, displayName, role, tenantId, pinSet, mustChangePassword, roles, modules, null);
  }
}
