package com.nammamedmate.server.feature.auth;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.nammamedmate.server.feature.branch.AssignedBranchResponse;
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
    ImpersonationResponse impersonation,
    String tenantStatus,
    Boolean emailVerified,
    List<AssignedBranchResponse> branches,
    UUID activeBranchId) {

  public LoginResponse(
      UUID userId,
      String displayName,
      String role,
      UUID tenantId,
      boolean pinSet,
      boolean mustChangePassword,
      List<AssignedRoleResponse> roles,
      List<String> modules) {
    this(
        userId,
        displayName,
        role,
        tenantId,
        pinSet,
        mustChangePassword,
        roles,
        modules,
        null,
        null,
        null,
        null,
        null);
  }

  public LoginResponse(
      UUID userId,
      String displayName,
      String role,
      UUID tenantId,
      boolean pinSet,
      boolean mustChangePassword,
      List<AssignedRoleResponse> roles,
      List<String> modules,
      ImpersonationResponse impersonation) {
    this(
        userId,
        displayName,
        role,
        tenantId,
        pinSet,
        mustChangePassword,
        roles,
        modules,
        impersonation,
        null,
        null,
        null,
        null);
  }

  public LoginResponse(
      UUID userId,
      String displayName,
      String role,
      UUID tenantId,
      boolean pinSet,
      boolean mustChangePassword,
      List<AssignedRoleResponse> roles,
      List<String> modules,
      ImpersonationResponse impersonation,
      String tenantStatus,
      Boolean emailVerified) {
    this(
        userId,
        displayName,
        role,
        tenantId,
        pinSet,
        mustChangePassword,
        roles,
        modules,
        impersonation,
        tenantStatus,
        emailVerified,
        null,
        null);
  }
}
