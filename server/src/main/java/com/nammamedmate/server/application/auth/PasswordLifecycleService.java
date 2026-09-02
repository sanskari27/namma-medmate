package com.nammamedmate.server.application.auth;

import com.nammamedmate.server.application.email.SendEmailCommand;
import com.nammamedmate.server.application.email.TransactionalEmailService;
import com.nammamedmate.server.domain.AppUser;
import com.nammamedmate.server.domain.AppUserRole;
import com.nammamedmate.server.domain.EmailNormalizer;
import com.nammamedmate.server.domain.EmailTemplate;
import com.nammamedmate.server.domain.PasswordHistory;
import com.nammamedmate.server.domain.PasswordPolicy;
import com.nammamedmate.server.domain.PasswordResetToken;
import com.nammamedmate.server.domain.Tenant;
import com.nammamedmate.server.domain.UserAccountStatus;
import com.nammamedmate.server.infrastructure.security.AuthPrincipal;
import com.nammamedmate.server.persistence.AppUserRepository;
import com.nammamedmate.server.persistence.PasswordHistoryRepository;
import com.nammamedmate.server.persistence.PasswordResetTokenRepository;
import com.nammamedmate.server.persistence.TenantRepository;
import com.nammamedmate.server.persistence.UserSessionRepository;
import com.nammamedmate.server.shared.exception.ApiException;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.Base64;
import java.util.HexFormat;
import java.util.Map;
import java.util.Objects;
import java.util.UUID;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class PasswordLifecycleService {

  static final String REUSED_CODE = "PASSWORD_REUSED";
  static final String REUSED_MESSAGE = "This password cannot be reused.";
  static final String TOKEN_INVALID_CODE = "RESET_TOKEN_INVALID";
  static final String TOKEN_INVALID_MESSAGE = "This reset link is invalid or has expired.";
  static final String NOT_FOUND_CODE = "NOT_FOUND";
  static final String NOT_FOUND_MESSAGE = "Account not found.";

  private final AppUserRepository appUserRepository;
  private final PasswordHistoryRepository passwordHistoryRepository;
  private final PasswordResetTokenRepository passwordResetTokenRepository;
  private final UserSessionRepository userSessionRepository;
  private final TenantRepository tenantRepository;
  private final TransactionalEmailService transactionalEmailService;
  private final PasswordEncoder passwordEncoder;
  private final Clock clock;
  private final long resetTtlMinutes;
  private final String dispensaryResetUrl;
  private final String adminResetUrl;
  private final SecureRandom secureRandom = new SecureRandom();

  public PasswordLifecycleService(
      AppUserRepository appUserRepository,
      PasswordHistoryRepository passwordHistoryRepository,
      PasswordResetTokenRepository passwordResetTokenRepository,
      UserSessionRepository userSessionRepository,
      TenantRepository tenantRepository,
      TransactionalEmailService transactionalEmailService,
      PasswordEncoder passwordEncoder,
      Clock clock,
      @Value("${app.password-reset.ttl-minutes:60}") long resetTtlMinutes,
      @Value("${app.password-reset.dispensary-url}") String dispensaryResetUrl,
      @Value("${app.password-reset.admin-url}") String adminResetUrl) {
    this.appUserRepository = appUserRepository;
    this.passwordHistoryRepository = passwordHistoryRepository;
    this.passwordResetTokenRepository = passwordResetTokenRepository;
    this.userSessionRepository = userSessionRepository;
    this.tenantRepository = tenantRepository;
    this.transactionalEmailService = transactionalEmailService;
    this.passwordEncoder = passwordEncoder;
    this.clock = clock;
    this.resetTtlMinutes = resetTtlMinutes;
    this.dispensaryResetUrl = dispensaryResetUrl;
    this.adminResetUrl = adminResetUrl;
  }

  @Transactional
  public AuthenticatedUser changePassword(
      AuthPrincipal principal, String currentPassword, String newPassword) {
    requireMinimumLength(newPassword);
    AppUser user = lockActiveUser(principal);
    if (!passwordEncoder.matches(currentPassword, user.getPasswordHash())) {
      throw new ApiException(
          HttpStatus.UNAUTHORIZED, "INVALID_CREDENTIALS", "Invalid email or password");
    }
    rejectIfReused(user, newPassword);
    Instant now = Instant.now(clock);
    rotatePassword(user, newPassword, now, false);
    userSessionRepository.revokeOtherSessions(user.getId(), principal.sessionId(), now);
    return toAuthenticatedUser(user, now);
  }

  @Transactional
  public ResetAccepted requestReset(String email) {
    String normalized = EmailNormalizer.normalize(email);
    AppUser user =
        appUserRepository.findByNormalizedEmailAndDeletedAtIsNull(normalized).orElse(null);
    if (user == null || !emailResetEligible(user) || user.getStatus() != UserAccountStatus.ACTIVE) {
      return new ResetAccepted(true);
    }
    AppUser locked = appUserRepository.lockById(user.getId()).orElse(null);
    if (locked == null
        || locked.getDeletedAt() != null
        || !emailResetEligible(locked)
        || locked.getStatus() != UserAccountStatus.ACTIVE) {
      return new ResetAccepted(true);
    }
    Instant now = Instant.now(clock);
    passwordResetTokenRepository.consumeUnusedForUser(locked.getId(), now);
    String rawToken = newRawToken();
    PasswordResetToken token = new PasswordResetToken();
    token.setId(UUID.randomUUID());
    token.setUserId(locked.getId());
    token.setTenantId(locked.getTenantId());
    token.setTokenHash(sha256(rawToken));
    token.setExpiresAt(now.plus(Duration.ofMinutes(resetTtlMinutes)));
    token.setCreatedAt(now);
    passwordResetTokenRepository.saveAndFlush(token);
    String resetUrl = resetUrlFor(locked, rawToken);
    String pharmacyName =
        locked.getTenantId() == null
            ? null
            : tenantRepository.findById(locked.getTenantId()).map(Tenant::getName).orElse(null);
    transactionalEmailService.send(
        new SendEmailCommand(
            EmailTemplate.PASSWORD_RESET,
            locked.getEmail(),
            locked.getTenantId(),
            pharmacyName,
            Map.of("resetUrl", resetUrl),
            "pwd-reset:" + locked.getId() + ":" + token.getId()));
    return new ResetAccepted(true);
  }

  @Transactional
  public ResetAccepted completeReset(String rawToken, String newPassword) {
    requireMinimumLength(newPassword);
    PasswordResetToken token =
        passwordResetTokenRepository.lockByTokenHash(sha256(rawToken)).orElse(null);
    Instant now = Instant.now(clock);
    if (token == null || token.getConsumedAt() != null || !token.getExpiresAt().isAfter(now)) {
      throw tokenInvalid();
    }
    AppUser user =
        appUserRepository
            .lockById(token.getUserId())
            .filter(candidate -> candidate.getDeletedAt() == null)
            .filter(candidate -> candidate.getStatus() == UserAccountStatus.ACTIVE)
            .orElseThrow(PasswordLifecycleService::tokenInvalid);
    if (!Objects.equals(user.getTenantId(), token.getTenantId())) {
      throw tokenInvalid();
    }
    rejectIfReused(user, newPassword);
    rotatePassword(user, newPassword, now, false);
    token.setConsumedAt(now);
    passwordResetTokenRepository.saveAndFlush(token);
    passwordResetTokenRepository.consumeUnusedForUser(user.getId(), now);
    userSessionRepository.revokeActiveSessions(user.getId(), now);
    return new ResetAccepted(true);
  }

  @Transactional
  public AuthenticatedUser adminReset(AuthPrincipal principal, String email, String newPassword) {
    requireMinimumLength(newPassword);
    AppUser actor = lockActiveUser(principal);
    String normalized = EmailNormalizer.normalize(email);
    AppUser target =
        appUserRepository.findByNormalizedEmailAndDeletedAtIsNull(normalized).orElse(null);
    if (target == null
        || target.getCreatedBy() == null
        || !target.getCreatedBy().equals(actor.getId())
        || !Objects.equals(actor.getTenantId(), target.getTenantId())) {
      throw notFound();
    }
    AppUser locked =
        appUserRepository
            .lockById(target.getId())
            .filter(candidate -> candidate.getDeletedAt() == null)
            .orElseThrow(PasswordLifecycleService::notFound);
    if (locked.getCreatedBy() == null
        || !locked.getCreatedBy().equals(actor.getId())
        || !Objects.equals(actor.getTenantId(), locked.getTenantId())) {
      throw notFound();
    }
    Instant now = Instant.now(clock);
    rejectIfReused(locked, newPassword);
    rotatePassword(locked, newPassword, now, true);
    userSessionRepository.revokeActiveSessions(locked.getId(), now);
    return toAuthenticatedUser(locked, now);
  }

  private void rotatePassword(AppUser user, String newPassword, Instant now, boolean mustChange) {
    appendHistory(user, now);
    user.setPasswordHash(passwordEncoder.encode(newPassword));
    user.setPasswordChangedAt(now);
    user.setMustChangePassword(mustChange);
    user.setUpdatedAt(now);
    appUserRepository.save(user);
  }

  private void appendHistory(AppUser user, Instant now) {
    PasswordHistory history = new PasswordHistory();
    history.setId(UUID.randomUUID());
    history.setUserId(user.getId());
    history.setTenantId(user.getTenantId());
    history.setPasswordHash(user.getPasswordHash());
    history.setCreatedAt(now);
    passwordHistoryRepository.save(history);
  }

  private void rejectIfReused(AppUser user, String newPassword) {
    if (passwordEncoder.matches(newPassword, user.getPasswordHash())) {
      throw reused();
    }
    for (PasswordHistory history :
        passwordHistoryRepository.findByUserIdAndTenantId(user.getId(), user.getTenantId())) {
      if (passwordEncoder.matches(newPassword, history.getPasswordHash())) {
        throw reused();
      }
    }
  }

  private AppUser lockActiveUser(AuthPrincipal principal) {
    return appUserRepository
        .lockById(principal.userId())
        .filter(candidate -> candidate.getDeletedAt() == null)
        .filter(candidate -> candidate.getStatus() == UserAccountStatus.ACTIVE)
        .filter(candidate -> Objects.equals(candidate.getTenantId(), principal.tenantId()))
        .orElseThrow(
            () ->
                new ApiException(
                    HttpStatus.UNAUTHORIZED, "UNAUTHORIZED", "Authentication required"));
  }

  private String resetUrlFor(AppUser user, String rawToken) {
    String base = user.getRole() == AppUserRole.admin_super ? adminResetUrl : dispensaryResetUrl;
    String join = base.contains("?") ? "&" : "?";
    return base + join + "token=" + rawToken;
  }

  private String newRawToken() {
    byte[] bytes = new byte[32];
    secureRandom.nextBytes(bytes);
    return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
  }

  private static String sha256(String raw) {
    try {
      byte[] digest =
          MessageDigest.getInstance("SHA-256").digest(raw.getBytes(StandardCharsets.UTF_8));
      return HexFormat.of().formatHex(digest);
    } catch (NoSuchAlgorithmException ex) {
      throw new IllegalStateException(ex);
    }
  }

  private static boolean emailResetEligible(AppUser user) {
    return user.getCreatedBy() == null
        && (user.getRole() == AppUserRole.admin_super
            || user.getRole() == AppUserRole.pharmacy_owner);
  }

  private static void requireMinimumLength(String password) {
    if (!PasswordPolicy.meetsMinimumLength(password)) {
      throw new ApiException(HttpStatus.BAD_REQUEST, "VALIDATION_ERROR", "Invalid request");
    }
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

  private static ApiException reused() {
    return new ApiException(HttpStatus.UNPROCESSABLE_ENTITY, REUSED_CODE, REUSED_MESSAGE);
  }

  private static ApiException tokenInvalid() {
    return new ApiException(
        HttpStatus.UNPROCESSABLE_ENTITY, TOKEN_INVALID_CODE, TOKEN_INVALID_MESSAGE);
  }

  private static ApiException notFound() {
    return new ApiException(HttpStatus.NOT_FOUND, NOT_FOUND_CODE, NOT_FOUND_MESSAGE);
  }
}
