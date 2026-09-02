package com.nammamedmate.server.feature.auth;

import com.nammamedmate.server.application.access.AccessIdentity;
import com.nammamedmate.server.application.access.AccessQueryService;
import com.nammamedmate.server.application.access.AccessRoleView;
import com.nammamedmate.server.application.auth.AuthService;
import com.nammamedmate.server.application.auth.AuthenticatedUser;
import com.nammamedmate.server.application.auth.LoginOutcome;
import com.nammamedmate.server.application.auth.PasswordLifecycleService;
import com.nammamedmate.server.application.auth.ResetAccepted;
import com.nammamedmate.server.application.auth.SavedLoginService;
import com.nammamedmate.server.infrastructure.security.AuthCookieService;
import com.nammamedmate.server.infrastructure.security.AuthPrincipal;
import com.nammamedmate.server.shared.exception.ApiException;
import com.nammamedmate.server.shared.web.ApiResponse;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
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

  public AuthController(
      AuthService authService,
      PasswordLifecycleService passwordLifecycleService,
      SavedLoginService savedLoginService,
      AuthCookieService authCookieService,
      AccessQueryService accessQueryService) {
    this.authService = authService;
    this.passwordLifecycleService = passwordLifecycleService;
    this.savedLoginService = savedLoginService;
    this.authCookieService = authCookieService;
    this.accessQueryService = accessQueryService;
  }

  @PostMapping("/login")
  public ApiResponse<LoginResponse> login(
      @Valid @RequestBody LoginRequest request,
      HttpServletRequest httpRequest,
      HttpServletResponse response) {
    LoginOutcome outcome = authService.login(request.email(), request.password());
    authCookieService.writeAccessToken(response, outcome.accessToken());
    UUID deviceId = authCookieService.ensureDeviceId(httpRequest, response);
    if (outcome.user().pinSet()) {
      savedLoginService.bind(deviceId, outcome.user().userId());
    }
    return ApiResponse.ok(toResponse(outcome.user()));
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
      throw new ApiException(HttpStatus.UNAUTHORIZED, "UNAUTHORIZED", "Authentication required");
    }
    LoginOutcome outcome = savedLoginService.pinLogin(deviceId, request.userId(), request.pin());
    authCookieService.writeAccessToken(response, outcome.accessToken());
    authCookieService.writeDeviceId(response, deviceId);
    return ApiResponse.ok(toResponse(outcome.user()));
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
    return ApiResponse.ok(toResponse(authService.currentUser(principal)));
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
    return ApiResponse.ok(toResponse(user));
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
      return ApiResponse.ok(toResponse(outcome.user()));
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
                principal, request.currentPassword(), request.newPassword())));
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
            passwordLifecycleService.adminReset(principal, request.email(), request.password())));
  }

  private LoginResponse toResponse(AuthenticatedUser user) {
    AccessIdentity identity = accessQueryService.identity(user.userId());
    return new LoginResponse(
        user.userId(),
        user.displayName(),
        user.role().name(),
        user.tenantId(),
        user.pinSet(),
        user.mustChangePassword(),
        identity.roles().stream().map(AuthController::toAssigned).toList(),
        identity.modules());
  }

  private static AssignedRoleResponse toAssigned(AccessRoleView role) {
    return new AssignedRoleResponse(
        role.id(), role.name(), role.code(), role.kind() == null ? null : role.kind().name());
  }
}
