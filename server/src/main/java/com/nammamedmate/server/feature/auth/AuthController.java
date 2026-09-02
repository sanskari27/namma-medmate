package com.nammamedmate.server.feature.auth;

import com.nammamedmate.server.application.auth.AuthService;
import com.nammamedmate.server.application.auth.AuthenticatedUser;
import com.nammamedmate.server.application.auth.LoginOutcome;
import com.nammamedmate.server.infrastructure.security.AuthCookieService;
import com.nammamedmate.server.infrastructure.security.AuthPrincipal;
import com.nammamedmate.server.shared.exception.ApiException;
import com.nammamedmate.server.shared.web.ApiResponse;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/auth")
public class AuthController {

  private final AuthService authService;
  private final AuthCookieService authCookieService;

  public AuthController(AuthService authService, AuthCookieService authCookieService) {
    this.authService = authService;
    this.authCookieService = authCookieService;
  }

  @PostMapping("/login")
  public ApiResponse<LoginResponse> login(
      @Valid @RequestBody LoginRequest request, HttpServletResponse response) {
    LoginOutcome outcome = authService.login(request.email(), request.password());
    authCookieService.writeAccessToken(response, outcome.accessToken());
    return ApiResponse.ok(toResponse(outcome.user()));
  }

  @GetMapping("/me")
  public ApiResponse<LoginResponse> me(Authentication authentication) {
    AuthPrincipal principal = (AuthPrincipal) authentication.getPrincipal();
    return ApiResponse.ok(toResponse(authService.currentUser(principal)));
  }

  @PostMapping("/pin")
  public ApiResponse<LoginResponse> setPin(
      @Valid @RequestBody PinRequest request, Authentication authentication) {
    AuthPrincipal principal = (AuthPrincipal) authentication.getPrincipal();
    return ApiResponse.ok(toResponse(authService.setPin(principal, request.pin())));
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

  private static LoginResponse toResponse(AuthenticatedUser user) {
    return new LoginResponse(
        user.userId(), user.displayName(), user.role().name(), user.tenantId(), user.pinSet());
  }
}
