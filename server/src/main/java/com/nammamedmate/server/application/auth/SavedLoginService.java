package com.nammamedmate.server.application.auth;

import com.nammamedmate.server.domain.AppUser;
import com.nammamedmate.server.domain.PasswordPolicy;
import com.nammamedmate.server.domain.SavedLogin;
import com.nammamedmate.server.domain.UserAccountStatus;
import com.nammamedmate.server.domain.UserSession;
import com.nammamedmate.server.infrastructure.security.JwtService;
import com.nammamedmate.server.persistence.AppUserRepository;
import com.nammamedmate.server.persistence.SavedLoginRepository;
import com.nammamedmate.server.persistence.UserSessionRepository;
import com.nammamedmate.server.shared.exception.ApiException;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.Objects;
import java.util.UUID;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class SavedLoginService {

  static final int PIN_ATTEMPT_LIMIT = 3;

  private final SavedLoginRepository savedLoginRepository;
  private final AppUserRepository appUserRepository;
  private final UserSessionRepository userSessionRepository;
  private final PasswordEncoder passwordEncoder;
  private final JwtService jwtService;
  private final Clock clock;
  private final long sessionTtlMinutes;
  private final long savedLoginTtlDays;

  public SavedLoginService(
      SavedLoginRepository savedLoginRepository,
      AppUserRepository appUserRepository,
      UserSessionRepository userSessionRepository,
      PasswordEncoder passwordEncoder,
      JwtService jwtService,
      Clock clock,
      @Value("${app.session.ttl-minutes:720}") long sessionTtlMinutes,
      @Value("${app.saved-login.ttl-days:30}") long savedLoginTtlDays) {
    this.savedLoginRepository = savedLoginRepository;
    this.appUserRepository = appUserRepository;
    this.userSessionRepository = userSessionRepository;
    this.passwordEncoder = passwordEncoder;
    this.jwtService = jwtService;
    this.clock = clock;
    this.sessionTtlMinutes = sessionTtlMinutes;
    this.savedLoginTtlDays = savedLoginTtlDays;
  }

  @Transactional(readOnly = true)
  public List<SavedLoginPerson> list(UUID deviceId) {
    Instant now = Instant.now(clock);
    return savedLoginRepository.findActiveUsersOnDevice(deviceId, now).stream()
        .map(
            user ->
                new SavedLoginPerson(
                    user.getId(), user.getDisplayName(), user.getRole().name(), user.getEmail()))
        .toList();
  }

  @Transactional
  public void bind(UUID deviceId, UUID userId) {
    AppUser user =
        appUserRepository
            .lockById(userId)
            .filter(candidate -> candidate.getDeletedAt() == null)
            .filter(candidate -> candidate.getStatus() == UserAccountStatus.ACTIVE)
            .orElse(null);
    if (user == null || user.getPinHash() == null) {
      return;
    }
    Instant now = Instant.now(clock);
    Instant expires = now.plus(Duration.ofDays(savedLoginTtlDays));
    SavedLogin existing =
        savedLoginRepository.lockByDeviceIdAndUserId(deviceId, userId).orElse(null);
    if (existing == null) {
      SavedLogin created = new SavedLogin();
      created.setId(UUID.randomUUID());
      created.setDeviceId(deviceId);
      created.setUserId(user.getId());
      created.setTenantId(user.getTenantId());
      created.setExpiresAt(expires);
      created.setFailedAttempts(0);
      created.setCreatedAt(now);
      created.setLastUsedAt(now);
      savedLoginRepository.save(created);
      return;
    }
    existing.setTenantId(user.getTenantId());
    existing.setRevokedAt(null);
    existing.setFailedAttempts(0);
    existing.setExpiresAt(expires);
    existing.setLastUsedAt(now);
    savedLoginRepository.save(existing);
  }

  @Transactional(noRollbackFor = ApiException.class)
  public LoginOutcome pinLogin(UUID deviceId, UUID userId, String pin) {
    requireSixDigitPin(pin);
    Instant now = Instant.now(clock);
    AppUser user =
        appUserRepository
            .lockById(userId)
            .filter(candidate -> candidate.getDeletedAt() == null)
            .orElseThrow(SavedLoginService::unauthorized);
    if (user.getStatus() != UserAccountStatus.ACTIVE) {
      throw new ApiException(
          HttpStatus.FORBIDDEN,
          AuthService.ACCOUNT_LOCKED_CODE,
          AuthService.ACCOUNT_LOCKED_MESSAGE);
    }
    SavedLogin binding =
        savedLoginRepository.lockByDeviceIdAndUserId(deviceId, userId).orElse(null);
    if (binding == null
        || binding.getRevokedAt() != null
        || !binding.getExpiresAt().isAfter(now)
        || !tenantMatches(binding, user)
        || user.getPinHash() == null) {
      throw unauthorized();
    }
    if (!passwordEncoder.matches(pin, user.getPinHash())) {
      binding.setFailedAttempts(binding.getFailedAttempts() + 1);
      if (binding.getFailedAttempts() >= PIN_ATTEMPT_LIMIT) {
        binding.setRevokedAt(now);
      }
      savedLoginRepository.save(binding);
      throw new ApiException(
          HttpStatus.UNAUTHORIZED, AuthService.INVALID_PIN_CODE, AuthService.INVALID_PIN_MESSAGE);
    }
    binding.setFailedAttempts(0);
    binding.setExpiresAt(now.plus(Duration.ofDays(savedLoginTtlDays)));
    binding.setLastUsedAt(now);
    savedLoginRepository.save(binding);

    userSessionRepository.revokeActiveSessions(user.getId(), now);
    UserSession session = new UserSession();
    session.setId(UUID.randomUUID());
    session.setUserId(user.getId());
    session.setTenantId(user.getTenantId());
    session.setExpiresAt(now.plus(Duration.ofMinutes(sessionTtlMinutes)));
    session.setCreatedAt(now);
    userSessionRepository.saveAndFlush(session);

    String token =
        jwtService.createToken(
            user.getId(),
            session.getId(),
            user.getTenantId(),
            user.getRole(),
            now,
            now.plus(Duration.ofMinutes(jwtService.accessTokenTtlMinutes())));
    return new LoginOutcome(toAuthenticatedUser(user, now), token);
  }

  @Transactional
  public void forget(UUID deviceId, UUID userId) {
    Instant now = Instant.now(clock);
    SavedLogin binding =
        savedLoginRepository.lockByDeviceIdAndUserId(deviceId, userId).orElse(null);
    if (binding == null || binding.getRevokedAt() != null) {
      return;
    }
    binding.setRevokedAt(now);
    savedLoginRepository.save(binding);
  }

  @Transactional
  public void revokeAllForUser(UUID userId) {
    savedLoginRepository.revokeActiveForUser(userId, Instant.now(clock));
  }

  private static boolean tenantMatches(SavedLogin binding, AppUser user) {
    return Objects.equals(binding.getTenantId(), user.getTenantId());
  }

  private AuthenticatedUser toAuthenticatedUser(AppUser user, Instant now) {
    return new AuthenticatedUser(
        user.getId(),
        user.getDisplayName(),
        user.getRole(),
        user.getTenantId(),
        user.getPinHash() != null,
        PasswordPolicy.mustChange(user.isMustChangePassword(), user.getPasswordChangedAt(), now));
  }

  private static void requireSixDigitPin(String pin) {
    if (pin == null || !pin.matches("^[0-9]{6}$")) {
      throw new ApiException(HttpStatus.BAD_REQUEST, "VALIDATION_ERROR", "Invalid request");
    }
  }

  private static ApiException unauthorized() {
    return new ApiException(HttpStatus.UNAUTHORIZED, "UNAUTHORIZED", "Authentication required");
  }
}
