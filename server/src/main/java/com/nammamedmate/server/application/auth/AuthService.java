package com.nammamedmate.server.application.auth;

import com.nammamedmate.server.domain.AppUser;
import com.nammamedmate.server.domain.EmailNormalizer;
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
import java.util.UUID;
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

  private final AppUserRepository appUserRepository;
  private final UserSessionRepository userSessionRepository;
  private final PasswordEncoder passwordEncoder;
  private final JwtService jwtService;
  private final Clock clock;

  public AuthService(
      AppUserRepository appUserRepository,
      UserSessionRepository userSessionRepository,
      PasswordEncoder passwordEncoder,
      JwtService jwtService,
      Clock clock) {
    this.appUserRepository = appUserRepository;
    this.userSessionRepository = userSessionRepository;
    this.passwordEncoder = passwordEncoder;
    this.jwtService = jwtService;
    this.clock = clock;
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
            session.getExpiresAt());
    return new LoginOutcome(toAuthenticatedUser(user), token);
  }

  private UserSession newSession(AppUser user, Instant now) {
    UserSession session = new UserSession();
    session.setId(UUID.randomUUID());
    session.setUserId(user.getId());
    session.setTenantId(user.getTenantId());
    session.setExpiresAt(now.plus(Duration.ofMinutes(jwtService.accessTokenTtlMinutes())));
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

  private static AuthenticatedUser toAuthenticatedUser(AppUser user) {
    return new AuthenticatedUser(
        user.getId(), user.getDisplayName(), user.getRole(), user.getTenantId());
  }

  private static ApiException invalidCredentials() {
    return new ApiException(
        HttpStatus.UNAUTHORIZED, INVALID_CREDENTIALS_CODE, INVALID_CREDENTIALS_MESSAGE);
  }
}
