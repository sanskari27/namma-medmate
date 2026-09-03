package com.nammamedmate.server.feature.impersonation;

import com.nammamedmate.server.application.access.AccessIdentity;
import com.nammamedmate.server.application.access.AccessQueryService;
import com.nammamedmate.server.application.access.AccessRoleView;
import com.nammamedmate.server.application.impersonation.ImpersonationService;
import com.nammamedmate.server.application.impersonation.ImpersonationService.AuthenticatedSnapshot;
import com.nammamedmate.server.application.impersonation.ImpersonationService.ImpersonationOutcome;
import com.nammamedmate.server.application.impersonation.ImpersonationService.ImpersonationView;
import com.nammamedmate.server.feature.auth.AssignedRoleResponse;
import com.nammamedmate.server.feature.auth.ImpersonationResponse;
import com.nammamedmate.server.feature.auth.LoginResponse;
import com.nammamedmate.server.infrastructure.security.AuthCookieService;
import com.nammamedmate.server.infrastructure.security.AuthPrincipal;
import com.nammamedmate.server.shared.web.ApiResponse;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/admin/impersonation")
public class ImpersonationController {

  private final ImpersonationService impersonationService;
  private final AccessQueryService accessQueryService;
  private final AuthCookieService authCookieService;

  public ImpersonationController(
      ImpersonationService impersonationService,
      AccessQueryService accessQueryService,
      AuthCookieService authCookieService) {
    this.impersonationService = impersonationService;
    this.accessQueryService = accessQueryService;
    this.authCookieService = authCookieService;
  }

  @PostMapping
  public ApiResponse<LoginResponse> start(
      @Valid @RequestBody StartImpersonationRequest request,
      Authentication authentication,
      HttpServletResponse response) {
    AuthPrincipal principal = (AuthPrincipal) authentication.getPrincipal();
    ImpersonationOutcome outcome = impersonationService.start(principal, request.email());
    authCookieService.writeAccessToken(response, outcome.accessToken());
    return ApiResponse.ok(toResponse(outcome));
  }

  @DeleteMapping
  public ApiResponse<LoginResponse> exit(
      Authentication authentication, HttpServletResponse response) {
    AuthPrincipal principal = (AuthPrincipal) authentication.getPrincipal();
    ImpersonationOutcome outcome = impersonationService.exit(principal);
    authCookieService.writeAccessToken(response, outcome.accessToken());
    return ApiResponse.ok(toResponse(outcome));
  }

  private LoginResponse toResponse(ImpersonationOutcome outcome) {
    AuthenticatedSnapshot user = outcome.user();
    AccessIdentity identity = accessQueryService.identity(user.userId());
    return new LoginResponse(
        user.userId(),
        user.displayName(),
        user.role().name(),
        user.tenantId(),
        user.pinSet(),
        user.mustChangePassword(),
        identity.roles().stream().map(ImpersonationController::toAssigned).toList(),
        identity.modules(),
        toImpersonation(outcome.impersonation()),
        null,
        null,
        List.of(),
        null);
  }

  private static ImpersonationResponse toImpersonation(ImpersonationView view) {
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
