package com.nammamedmate.server.application.auth;

import com.nammamedmate.server.domain.AppUser;
import com.nammamedmate.server.domain.EmailNormalizer;
import com.nammamedmate.server.domain.PasswordPolicy;
import com.nammamedmate.server.domain.UserAccountStatus;
import com.nammamedmate.server.domain.UserSession;
import com.nammamedmate.server.infrastructure.security.AuthPrincipal;
import com.nammamedmate.server.infrastructure.security.JwtService;
import com.nammamedmate.server.persistence.AppUserRepository;
import com.nammamedmate.server.persistence.UserSessionRepository;
import com.nammamedmate.server.shared.exception.ApiException;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.Objects;
import java.util.UUID;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AuthService {

  static final String INVALID_CREDENTIALS_CODE = "INVALID_CREDENTIALS";
  static final String INVALID_CREDENTIALS_MESSAGE = "Invalid email or password";
  static final String ACCOUNT_LOCKED_CODE = "ACCOUNT_CANNOT_SIGN_IN";
  static final String ACCOUNT_LOCKED_MESSAGE = "This account cannot sign in.";
  static final String PIN_ALREADY_SET_CODE = "PIN_ALREADY_SET";
  static final String PIN_ALREADY_SET_MESSAGE = "PIN is already set.";
  static final String PIN_NOT_SET_CODE = "PIN_NOT_SET";
  static final String PIN_NOT_SET_MESSAGE = "PIN has not been set.";
  static final String INVALID_PIN_CODE = "INVALID_PIN";
  static final String INVALID_PIN_MESSAGE = "Incorrect PIN";
  static final String SESSION_REVOKED_CODE = "SESSION_REVOKED";
  static final String SESSION_REVOKED_MESSAGE = "Session ended. Sign in again.";
  static final int PIN_ATTEMPT_LIMIT = 3;

  private final AppUserRepository appUserRepository;
  private final UserSessionRepository userSessionRepository;
  private final PasswordEncoder passwordEncoder;
  private final JwtService jwtService;
  private final Clock clock;
  private final long sessionTtlMinutes;

  public AuthService(
      AppUserRepository appUserRepository,
      UserSessionRepository userSessionRepository,
      PasswordEncoder passwordEncoder,
      JwtService jwtService,
      Clock clock,
      @Value("${app.session.ttl-minutes:720}") long sessionTtlMinutes) {
    this.appUserRepository = appUserRepository;
    this.userSessionRepository = userSessionRepository;
    this.passwordEncoder = passwordEncoder;
    this.jwtService = jwtService;
    this.clock = clock;
    this.sessionTtlMinutes = sessionTtlMinutes;
  }

  @Transactional
  public LoginOutcome login(String email, String password) {
    String normalized = EmailNormalizer.normalize(email);
    AppUser user =
        appUserRepository
            .findByNormalizedEmailAndDeletedAtIsNull(normalized)
            .orElseThrow(AuthService::invalidCredentials);

    if (!passwordEncoder.matches(password, user.getPasswordHash())) {
      throw invalidCredentials();
    }
    if (user.getStatus() != UserAccountStatus.ACTIVE) {
      throw new ApiException(HttpStatus.FORBIDDEN, ACCOUNT_LOCKED_CODE, ACCOUNT_LOCKED_MESSAGE);
    }

    Instant now = Instant.now(clock);
    appUserRepository.lockById(user.getId()).orElseThrow(AuthService::invalidCredentials);
    userSessionRepository.revokeActiveSessions(user.getId(), now);
    UserSession session = userSessionRepository.saveAndFlush(newSession(user, now));

    String token =
        jwtService.createToken(
            user.getId(),
            session.getId(),
            user.getTenantId(),
            user.getRole(),
            now,
            now.plus(Duration.ofMinutes(jwtService.accessTokenTtlMinutes())));
    return new LoginOutcome(toAuthenticatedUser(user), token, session.getId());
  }

  private UserSession newSession(AppUser user, Instant now) {
    UserSession session = new UserSession();
    session.setId(UUID.randomUUID());
    session.setUserId(user.getId());
    session.setTenantId(user.getTenantId());
    session.setExpiresAt(now.plus(Duration.ofMinutes(sessionTtlMinutes)));
    session.setCreatedAt(now);
    return session;
  }

  @Transactional(readOnly = true)
  public AuthenticatedUser currentUser(AuthPrincipal principal) {
    AppUser user =
        appUserRepository
            .findById(principal.userId())
            .filter(candidate -> candidate.getDeletedAt() == null)
            .filter(candidate -> candidate.getStatus() == UserAccountStatus.ACTIVE)
            .orElseThrow(
                () ->
                    new ApiException(
                        HttpStatus.UNAUTHORIZED, "UNAUTHORIZED", "Authentication required"));
    return toAuthenticatedUser(user);
  }

  @Transactional
  public AuthenticatedUser setPin(AuthPrincipal principal, String pin) {
    requireSixDigitPin(pin);
    AppUser user = lockActiveUser(principal);
    if (user.getPinHash() != null) {
      throw new ApiException(HttpStatus.CONFLICT, PIN_ALREADY_SET_CODE, PIN_ALREADY_SET_MESSAGE);
    }
    user.setPinHash(passwordEncoder.encode(pin));
    user.setUpdatedAt(Instant.now(clock));
    appUserRepository.save(user);
    return toAuthenticatedUser(user);
  }

  @Transactional
  public void logout(AuthPrincipal principal) {
    Instant now = Instant.now(clock);
    userSessionRepository
        .lockActiveScopedSession(principal.sessionId(), principal.userId(), principal.tenantId())
        .ifPresent(
            session -> {
              session.setRevokedAt(now);
              userSessionRepository.save(session);
            });
  }

  @Transactional(noRollbackFor = ApiException.class)
  public LoginOutcome unlockPin(AuthPrincipal principal, String pin) {
    requireSixDigitPin(pin);
    AppUser user = lockActiveUser(principal);
    UserSession session =
        userSessionRepository
            .lockActiveScopedSession(
                principal.sessionId(), principal.userId(), principal.tenantId())
            .orElseThrow(AuthService::unauthorized);
    if (user.getPinHash() == null) {
      throw new ApiException(
          HttpStatus.UNPROCESSABLE_ENTITY, PIN_NOT_SET_CODE, PIN_NOT_SET_MESSAGE);
    }
    if (!passwordEncoder.matches(pin, user.getPinHash())) {
      session.setPinFailedAttempts(session.getPinFailedAttempts() + 1);
      if (session.getPinFailedAttempts() >= PIN_ATTEMPT_LIMIT) {
        session.setRevokedAt(Instant.now(clock));
        userSessionRepository.save(session);
        throw new ApiException(
            HttpStatus.UNAUTHORIZED, SESSION_REVOKED_CODE, SESSION_REVOKED_MESSAGE);
      }
      userSessionRepository.save(session);
      throw new ApiException(HttpStatus.UNAUTHORIZED, INVALID_PIN_CODE, INVALID_PIN_MESSAGE);
    }
    Instant now = Instant.now(clock);
    session.setPinFailedAttempts(0);
    session.setExpiresAt(now.plus(Duration.ofMinutes(sessionTtlMinutes)));
    userSessionRepository.save(session);
    String token =
        jwtService.createToken(
            user.getId(),
            session.getId(),
            user.getTenantId(),
            user.getRole(),
            now,
            now.plus(Duration.ofMinutes(jwtService.accessTokenTtlMinutes())));
    return new LoginOutcome(toAuthenticatedUser(user), token, session.getId());
  }

  private AppUser lockActiveUser(AuthPrincipal principal) {
    return appUserRepository
        .lockById(principal.userId())
        .filter(candidate -> candidate.getDeletedAt() == null)
        .filter(candidate -> candidate.getStatus() == UserAccountStatus.ACTIVE)
        .filter(candidate -> Objects.equals(candidate.getTenantId(), principal.tenantId()))
        .orElseThrow(AuthService::unauthorized);
  }

  private AuthenticatedUser toAuthenticatedUser(AppUser user) {
    return new AuthenticatedUser(
        user.getId(),
        user.getDisplayName(),
        user.getRole(),
        user.getTenantId(),
        user.getPinHash() != null,
        PasswordPolicy.mustChange(
            user.isMustChangePassword(), user.getPasswordChangedAt(), Instant.now(clock)));
  }

  private static void requireSixDigitPin(String pin) {
    if (pin == null || !pin.matches("^[0-9]{6}$")) {
      throw new ApiException(HttpStatus.BAD_REQUEST, "VALIDATION_ERROR", "Invalid request");
    }
  }

  private static ApiException unauthorized() {
    return new ApiException(HttpStatus.UNAUTHORIZED, "UNAUTHORIZED", "Authentication required");
  }

  private static ApiException invalidCredentials() {
    return new ApiException(
        HttpStatus.UNAUTHORIZED, INVALID_CREDENTIALS_CODE, INVALID_CREDENTIALS_MESSAGE);
  }
}
