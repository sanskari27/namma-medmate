package com.nammamedmate.server.feature.auth;

import com.nammamedmate.server.application.access.AccessIdentity;
import com.nammamedmate.server.application.access.AccessQueryService;
import com.nammamedmate.server.application.access.AccessRoleView;
import com.nammamedmate.server.application.audit.AuditRecordCommand;
import com.nammamedmate.server.application.audit.AuditService;
import com.nammamedmate.server.application.auth.AuthService;
import com.nammamedmate.server.application.auth.AuthenticatedUser;
import com.nammamedmate.server.application.auth.LoginOutcome;
import com.nammamedmate.server.application.auth.PasswordLifecycleService;
import com.nammamedmate.server.application.auth.ResetAccepted;
import com.nammamedmate.server.application.auth.SavedLoginService;
import com.nammamedmate.server.application.branch.AssignedBranchView;
import com.nammamedmate.server.application.branch.SessionBranchService;
import com.nammamedmate.server.application.branch.SessionBranchView;
import com.nammamedmate.server.application.impersonation.ImpersonationService;
import com.nammamedmate.server.feature.branch.AssignedBranchResponse;
import com.nammamedmate.server.infrastructure.security.AuthCookieService;
import com.nammamedmate.server.infrastructure.security.AuthPrincipal;
import com.nammamedmate.server.shared.exception.ApiException;
import com.nammamedmate.server.shared.web.ApiResponse;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/auth")
public class AuthController {

  private final AuthService authService;
  private final PasswordLifecycleService passwordLifecycleService;
  private final SavedLoginService savedLoginService;
  private final AuthCookieService authCookieService;
  private final AccessQueryService accessQueryService;
  private final AuditService auditService;
  private final ImpersonationService impersonationService;
  private final SessionBranchService sessionBranchService;

  public AuthController(
      AuthService authService,
      PasswordLifecycleService passwordLifecycleService,
      SavedLoginService savedLoginService,
      AuthCookieService authCookieService,
      AccessQueryService accessQueryService,
      AuditService auditService,
      ImpersonationService impersonationService,
      SessionBranchService sessionBranchService) {
    this.authService = authService;
    this.passwordLifecycleService = passwordLifecycleService;
    this.savedLoginService = savedLoginService;
    this.authCookieService = authCookieService;
    this.accessQueryService = accessQueryService;
    this.auditService = auditService;
    this.impersonationService = impersonationService;
    this.sessionBranchService = sessionBranchService;
  }

  @PostMapping("/login")
  public ApiResponse<LoginResponse> login(
      @Valid @RequestBody LoginRequest request,
      HttpServletRequest httpRequest,
      HttpServletResponse response) {
    try {
      LoginOutcome outcome = authService.login(request.email(), request.password());
      authCookieService.writeAccessToken(response, outcome.accessToken());
      UUID deviceId = authCookieService.ensureDeviceId(httpRequest, response);
      if (outcome.user().pinSet()) {
        savedLoginService.bind(deviceId, outcome.user().userId());
      }
      auditLogin(
          AuditService.LOGIN_ACTION,
          AuditService.OUTCOME_SUCCESS,
          request.email(),
          outcome.user().userId(),
          outcome.user().tenantId(),
          outcome.sessionId(),
          httpRequest);
      return ApiResponse.ok(toResponse(outcome.user(), outcome.sessionId()));
    } catch (ApiException ex) {
      auditLogin(
          AuditService.LOGIN_ACTION,
          AuditService.OUTCOME_FAILURE,
          request.email(),
          null,
          null,
          null,
          httpRequest);
      throw ex;
    }
  }

  @GetMapping("/saved-logins")
  public ApiResponse<SavedLoginsResponse> savedLogins(
      HttpServletRequest request, HttpServletResponse response) {
    UUID deviceId = authCookieService.ensureDeviceId(request, response);
    return ApiResponse.ok(new SavedLoginsResponse(savedLoginService.list(deviceId)));
  }

  @PostMapping("/pin/login")
  public ApiResponse<LoginResponse> pinLogin(
      @Valid @RequestBody PinLoginRequest request,
      HttpServletRequest httpRequest,
      HttpServletResponse response) {
    UUID deviceId = authCookieService.readDeviceId(httpRequest);
    if (deviceId == null) {
      auditLogin(
          AuditService.PIN_LOGIN_ACTION,
          AuditService.OUTCOME_FAILURE,
          request.userId().toString(),
          null,
          null,
          null,
          httpRequest);
      throw new ApiException(HttpStatus.UNAUTHORIZED, "UNAUTHORIZED", "Authentication required");
    }
    try {
      LoginOutcome outcome = savedLoginService.pinLogin(deviceId, request.userId(), request.pin());
      authCookieService.writeAccessToken(response, outcome.accessToken());
      authCookieService.writeDeviceId(response, deviceId);
      auditLogin(
          AuditService.PIN_LOGIN_ACTION,
          AuditService.OUTCOME_SUCCESS,
          request.userId().toString(),
          outcome.user().userId(),
          outcome.user().tenantId(),
          outcome.sessionId(),
          httpRequest);
      return ApiResponse.ok(toResponse(outcome.user(), outcome.sessionId()));
    } catch (ApiException ex) {
      auditLogin(
          AuditService.PIN_LOGIN_ACTION,
          AuditService.OUTCOME_FAILURE,
          request.userId().toString(),
          null,
          null,
          null,
          httpRequest);
      throw ex;
    }
  }

  @DeleteMapping("/saved-logins/{userId}")
  public ApiResponse<SavedLoginForgottenResponse> forget(
      @PathVariable UUID userId, HttpServletRequest request) {
    UUID deviceId = authCookieService.readDeviceId(request);
    if (deviceId == null) {
      throw new ApiException(HttpStatus.UNAUTHORIZED, "UNAUTHORIZED", "Authentication required");
    }
    savedLoginService.forget(deviceId, userId);
    return ApiResponse.ok(new SavedLoginForgottenResponse(true));
  }

  @PostMapping("/logout")
  public ApiResponse<LogoutResponse> logout(
      Authentication authentication, HttpServletResponse response) {
    AuthPrincipal principal = (AuthPrincipal) authentication.getPrincipal();
    authService.logout(principal);
    authCookieService.clearAccessToken(response);
    return ApiResponse.ok(new LogoutResponse(true));
  }

  @GetMapping("/me")
  public ApiResponse<LoginResponse> me(Authentication authentication) {
    AuthPrincipal principal = (AuthPrincipal) authentication.getPrincipal();
    return ApiResponse.ok(toResponse(authService.currentUser(principal), principal));
  }

  @PostMapping("/pin")
  public ApiResponse<LoginResponse> setPin(
      @Valid @RequestBody PinRequest request,
      Authentication authentication,
      HttpServletRequest httpRequest,
      HttpServletResponse response) {
    AuthPrincipal principal = (AuthPrincipal) authentication.getPrincipal();
    AuthenticatedUser user = authService.setPin(principal, request.pin());
    UUID deviceId = authCookieService.ensureDeviceId(httpRequest, response);
    savedLoginService.bind(deviceId, user.userId());
    return ApiResponse.ok(toResponse(user, principal));
  }

  @PostMapping("/pin/unlock")
  public ApiResponse<LoginResponse> unlockPin(
      @Valid @RequestBody PinRequest request,
      Authentication authentication,
      HttpServletResponse response) {
    AuthPrincipal principal = (AuthPrincipal) authentication.getPrincipal();
    try {
      LoginOutcome outcome = authService.unlockPin(principal, request.pin());
      authCookieService.writeAccessToken(response, outcome.accessToken());
      return ApiResponse.ok(toResponse(outcome.user(), outcome.sessionId()));
    } catch (ApiException ex) {
      if ("SESSION_REVOKED".equals(ex.getCode())) {
        authCookieService.clearAccessToken(response);
      }
      throw ex;
    }
  }

  @PostMapping("/password")
  public ApiResponse<LoginResponse> changePassword(
      @Valid @RequestBody ChangePasswordRequest request, Authentication authentication) {
    AuthPrincipal principal = (AuthPrincipal) authentication.getPrincipal();
    return ApiResponse.ok(
        toResponse(
            passwordLifecycleService.changePassword(
                principal, request.currentPassword(), request.newPassword()),
            principal));
  }

  @PostMapping("/password/reset-request")
  public ApiResponse<PasswordResetAcceptedResponse> requestReset(
      @Valid @RequestBody PasswordResetRequest request) {
    ResetAccepted accepted = passwordLifecycleService.requestReset(request.email());
    return ApiResponse.ok(new PasswordResetAcceptedResponse(accepted.accepted()));
  }

  @PostMapping("/password/reset")
  public ApiResponse<PasswordResetAcceptedResponse> completeReset(
      @Valid @RequestBody CompletePasswordResetRequest request) {
    ResetAccepted accepted =
        passwordLifecycleService.completeReset(request.token(), request.password());
    return ApiResponse.ok(new PasswordResetAcceptedResponse(accepted.accepted()));
  }

  @PostMapping("/password/admin-reset")
  public ApiResponse<LoginResponse> adminReset(
      @Valid @RequestBody AdminPasswordResetRequest request, Authentication authentication) {
    AuthPrincipal principal = (AuthPrincipal) authentication.getPrincipal();
    return ApiResponse.ok(
        toResponse(
            passwordLifecycleService.adminReset(principal, request.email(), request.password()),
            principal));
  }

  private void auditLogin(
      String action,
      String outcome,
      String attemptedIdentity,
      UUID userId,
      UUID tenantId,
      UUID sessionId,
      HttpServletRequest httpRequest) {
    auditService.record(
        new AuditRecordCommand(
            userId,
            tenantId,
            null,
            action,
            outcome,
            attemptedIdentity,
            clientIp(httpRequest),
            httpRequest.getHeader("User-Agent"),
            sessionId,
            null));
  }

  private static String clientIp(HttpServletRequest request) {
    String forwarded = request.getHeader("X-Forwarded-For");
    if (forwarded != null && !forwarded.isBlank()) {
      int comma = forwarded.indexOf(',');
      return comma > 0 ? forwarded.substring(0, comma).trim() : forwarded.trim();
    }
    return request.getRemoteAddr();
  }

  private LoginResponse toResponse(AuthenticatedUser user, UUID sessionId) {
    return toResponse(user, null, sessionBranchService.viewForSession(sessionId, user.userId()));
  }

  private LoginResponse toResponse(AuthenticatedUser user, AuthPrincipal principal) {
    SessionBranchView branchView =
        user.tenantId() == null
            ? new SessionBranchView(null, List.of())
            : sessionBranchService.currentFor(principal);
    return toResponse(user, impersonationService.currentView(principal), branchView);
  }

  private LoginResponse toResponse(
      AuthenticatedUser user,
      com.nammamedmate.server.application.impersonation.ImpersonationService.ImpersonationView
          impersonation,
      SessionBranchView branchView) {
    AccessIdentity identity = accessQueryService.identity(user.userId());
    SessionBranchView branches =
        branchView == null ? new SessionBranchView(null, List.of()) : branchView;
    return new LoginResponse(
        user.userId(),
        user.displayName(),
        user.role().name(),
        user.tenantId(),
        user.pinSet(),
        user.mustChangePassword(),
        identity.roles().stream().map(AuthController::toAssigned).toList(),
        identity.modules(),
        toImpersonation(impersonation),
        user.tenantStatus() == null ? null : user.tenantStatus().name(),
        user.emailVerified(),
        branches.branches().stream().map(AuthController::toBranch).toList(),
        branches.activeBranchId());
  }

  private static AssignedBranchResponse toBranch(AssignedBranchView view) {
    return new AssignedBranchResponse(
        view.id(), view.name(), view.branchCode(), view.status().name());
  }

  private static ImpersonationResponse toImpersonation(
      com.nammamedmate.server.application.impersonation.ImpersonationService.ImpersonationView
          view) {
    if (view == null) {
      return null;
    }
    return new ImpersonationResponse(
        view.originalUserId(),
        view.originalDisplayName(),
        view.effectiveUserId(),
        view.effectiveDisplayName(),
        view.effectiveRole(),
        view.tenantId(),
        view.tenantName());
  }

  private static AssignedRoleResponse toAssigned(AccessRoleView role) {
    return new AssignedRoleResponse(
        role.id(), role.name(), role.code(), role.kind() == null ? null : role.kind().name());
  }
}
