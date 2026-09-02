package com.nammamedmate.server.application.impersonation;

import com.nammamedmate.server.domain.AppUser;
import com.nammamedmate.server.domain.AppUserRole;
import com.nammamedmate.server.domain.EmailNormalizer;
import com.nammamedmate.server.domain.PasswordPolicy;
import com.nammamedmate.server.domain.Tenant;
import com.nammamedmate.server.domain.UserAccountStatus;
import com.nammamedmate.server.domain.UserSession;
import com.nammamedmate.server.infrastructure.security.AuthPrincipal;
import com.nammamedmate.server.infrastructure.security.JwtService;
import com.nammamedmate.server.persistence.AppUserRepository;
import com.nammamedmate.server.persistence.TenantRepository;
import com.nammamedmate.server.persistence.UserSessionRepository;
import com.nammamedmate.server.shared.exception.ApiException;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ImpersonationService {

  private final AppUserRepository appUserRepository;
  private final TenantRepository tenantRepository;
  private final UserSessionRepository userSessionRepository;
  private final JwtService jwtService;
  private final Clock clock;

  public ImpersonationService(
      AppUserRepository appUserRepository,
      TenantRepository tenantRepository,
      UserSessionRepository userSessionRepository,
      JwtService jwtService,
      Clock clock) {
    this.appUserRepository = appUserRepository;
    this.tenantRepository = tenantRepository;
    this.userSessionRepository = userSessionRepository;
    this.jwtService = jwtService;
    this.clock = clock;
  }

  @Transactional(readOnly = true)
  public ImpersonationOutcome start(AuthPrincipal principal, String email) {
    requireMasterNotImpersonating(principal);
    AppUser master = requireActiveSessionOwner(principal);
    AppUser target = resolveTarget(email);
    Tenant tenant =
        tenantRepository
            .findById(target.getTenantId())
            .filter(t -> t.getDeletedAt() == null)
            .orElseThrow(ImpersonationService::notFound);

    UserSession session = requireActiveMasterSession(principal);
    Instant now = Instant.now(clock);
    Instant tokenExpires = now.plus(Duration.ofMinutes(jwtService.accessTokenTtlMinutes()));
    if (session.getExpiresAt().isBefore(tokenExpires)) {
      tokenExpires = session.getExpiresAt();
    }

    String token =
        jwtService.createToken(
            master.getId(),
            session.getId(),
            master.getTenantId(),
            master.getRole(),
            now,
            tokenExpires,
            new JwtService.ActingIdentity(target.getId(), target.getTenantId(), target.getRole()));

    return new ImpersonationOutcome(
        toAuthenticated(target),
        token,
        new ImpersonationView(
            master.getId(),
            master.getDisplayName(),
            target.getId(),
            target.getDisplayName(),
            target.getRole().name(),
            tenant.getId(),
            tenant.getName()));
  }

  @Transactional(readOnly = true)
  public ImpersonationOutcome exit(AuthPrincipal principal) {
    if (!principal.impersonating()) {
      throw new ApiException(
          HttpStatus.CONFLICT, "NOT_IMPERSONATING", "No support session is active.");
    }
    AppUser master = requireActiveSessionOwner(principal);
    if (master.getRole() != AppUserRole.admin_super) {
      throw new ApiException(HttpStatus.FORBIDDEN, "FORBIDDEN", "Access denied");
    }
    UserSession session = requireActiveMasterSession(principal);
    Instant now = Instant.now(clock);
    Instant tokenExpires = now.plus(Duration.ofMinutes(jwtService.accessTokenTtlMinutes()));
    if (session.getExpiresAt().isBefore(tokenExpires)) {
      tokenExpires = session.getExpiresAt();
    }
    String token =
        jwtService.createToken(
            master.getId(),
            session.getId(),
            master.getTenantId(),
            master.getRole(),
            now,
            tokenExpires);
    return new ImpersonationOutcome(toAuthenticated(master), token, null);
  }

  @Transactional(readOnly = true)
  public ImpersonationView currentView(AuthPrincipal principal) {
    if (!principal.impersonating()) {
      return null;
    }
    AppUser master =
        appUserRepository
            .findById(principal.sessionUserId())
            .filter(u -> u.getDeletedAt() == null)
            .orElse(null);
    AppUser effective =
        appUserRepository
            .findById(principal.userId())
            .filter(u -> u.getDeletedAt() == null)
            .orElse(null);
    if (master == null || effective == null || effective.getTenantId() == null) {
      return null;
    }
    Tenant tenant =
        tenantRepository
            .findById(effective.getTenantId())
            .filter(t -> t.getDeletedAt() == null)
            .orElse(null);
    if (tenant == null) {
      return null;
    }
    return new ImpersonationView(
        master.getId(),
        master.getDisplayName(),
        effective.getId(),
        effective.getDisplayName(),
        effective.getRole().name(),
        tenant.getId(),
        tenant.getName());
  }

  private void requireMasterNotImpersonating(AuthPrincipal principal) {
    if (principal.impersonating()) {
      throw new ApiException(
          HttpStatus.CONFLICT,
          "ALREADY_IMPERSONATING",
          "Exit the current support session before starting another.");
    }
    if (principal.role() != AppUserRole.admin_super) {
      throw new ApiException(HttpStatus.FORBIDDEN, "FORBIDDEN", "Access denied");
    }
  }

  private AppUser requireActiveSessionOwner(AuthPrincipal principal) {
    return appUserRepository
        .findById(principal.sessionUserId())
        .filter(u -> u.getDeletedAt() == null)
        .filter(u -> u.getStatus() == UserAccountStatus.ACTIVE)
        .orElseThrow(
            () ->
                new ApiException(
                    HttpStatus.UNAUTHORIZED, "UNAUTHORIZED", "Authentication required"));
  }

  private UserSession requireActiveMasterSession(AuthPrincipal principal) {
    Instant now = Instant.now(clock);
    return userSessionRepository
        .findActiveScopedSession(
            principal.sessionId(), principal.sessionUserId(), principal.sessionTenantId())
        .filter(s -> s.getExpiresAt().isAfter(now))
        .orElseThrow(
            () ->
                new ApiException(
                    HttpStatus.UNAUTHORIZED, "UNAUTHORIZED", "Authentication required"));
  }

  private AppUser resolveTarget(String email) {
    String normalized = EmailNormalizer.normalize(email);
    AppUser target =
        appUserRepository
            .findByNormalizedEmailAndDeletedAtIsNull(normalized)
            .orElseThrow(ImpersonationService::notFound);
    if (target.getTenantId() == null
        || target.getRole() == AppUserRole.admin_super
        || target.getRole() == AppUserRole.admin_verification) {
      throw new ApiException(
          HttpStatus.UNPROCESSABLE_ENTITY,
          "INVALID_TARGET",
          "Only active tenant users can be entered for support.");
    }
    if (target.getStatus() != UserAccountStatus.ACTIVE) {
      throw new ApiException(
          HttpStatus.UNPROCESSABLE_ENTITY,
          "TARGET_INACTIVE",
          "That account cannot be entered for support.");
    }
    return target;
  }

  private AuthenticatedSnapshot toAuthenticated(AppUser user) {
    return new AuthenticatedSnapshot(
        user.getId(),
        user.getDisplayName(),
        user.getRole(),
        user.getTenantId(),
        user.getPinHash() != null,
        PasswordPolicy.mustChange(
            user.isMustChangePassword(), user.getPasswordChangedAt(), Instant.now(clock)));
  }

  private static ApiException notFound() {
    return new ApiException(HttpStatus.NOT_FOUND, "NOT_FOUND", "User not found");
  }

  public record AuthenticatedSnapshot(
      UUID userId,
      String displayName,
      AppUserRole role,
      UUID tenantId,
      boolean pinSet,
      boolean mustChangePassword) {}

  public record ImpersonationOutcome(
      AuthenticatedSnapshot user, String accessToken, ImpersonationView impersonation) {}

  public record ImpersonationView(
      UUID originalUserId,
      String originalDisplayName,
      UUID effectiveUserId,
      String effectiveDisplayName,
      String effectiveRole,
      UUID tenantId,
      String tenantName) {}
}
