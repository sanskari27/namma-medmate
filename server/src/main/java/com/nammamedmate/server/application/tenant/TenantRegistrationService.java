package com.nammamedmate.server.application.tenant;

import com.nammamedmate.server.application.email.SendEmailCommand;
import com.nammamedmate.server.application.email.TransactionalEmailService;
import com.nammamedmate.server.domain.AppUser;
import com.nammamedmate.server.domain.AppUserRole;
import com.nammamedmate.server.domain.EmailNormalizer;
import com.nammamedmate.server.domain.EmailTemplate;
import com.nammamedmate.server.domain.EmailVerificationToken;
import com.nammamedmate.server.domain.PasswordPolicy;
import com.nammamedmate.server.domain.Tenant;
import com.nammamedmate.server.domain.TenantSlug;
import com.nammamedmate.server.domain.TenantStatus;
import com.nammamedmate.server.domain.UserAccountStatus;
import com.nammamedmate.server.persistence.AppUserRepository;
import com.nammamedmate.server.persistence.EmailVerificationTokenRepository;
import com.nammamedmate.server.persistence.TenantRepository;
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
import java.util.UUID;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

@Service
public class TenantRegistrationService {

  static final String EMAIL_TAKEN_CODE = "EMAIL_TAKEN";
  static final String EMAIL_TAKEN_MESSAGE = "This email is already in use.";
  static final String TOKEN_INVALID_CODE = "VERIFY_TOKEN_INVALID";
  static final String TOKEN_INVALID_MESSAGE = "This verification link is invalid or has expired.";

  private final TenantRepository tenantRepository;
  private final AppUserRepository appUserRepository;
  private final EmailVerificationTokenRepository emailVerificationTokenRepository;
  private final TransactionalEmailService transactionalEmailService;
  private final PasswordEncoder passwordEncoder;
  private final Clock clock;
  private final long verifyTtlMinutes;
  private final String dispensaryVerifyUrl;
  private final SecureRandom secureRandom = new SecureRandom();

  public TenantRegistrationService(
      TenantRepository tenantRepository,
      AppUserRepository appUserRepository,
      EmailVerificationTokenRepository emailVerificationTokenRepository,
      TransactionalEmailService transactionalEmailService,
      PasswordEncoder passwordEncoder,
      Clock clock,
      @Value("${app.email-verification.ttl-minutes:60}") long verifyTtlMinutes,
      @Value("${app.email-verification.dispensary-url}") String dispensaryVerifyUrl) {
    this.tenantRepository = tenantRepository;
    this.appUserRepository = appUserRepository;
    this.emailVerificationTokenRepository = emailVerificationTokenRepository;
    this.transactionalEmailService = transactionalEmailService;
    this.passwordEncoder = passwordEncoder;
    this.clock = clock;
    this.verifyTtlMinutes = verifyTtlMinutes;
    this.dispensaryVerifyUrl = dispensaryVerifyUrl;
  }

  @Transactional
  public TenantRegistrationResult register(
      String businessName, String email, String phone, String password) {
    requireBusinessName(businessName);
    requirePhone(phone);
    requirePassword(password);
    String normalized = EmailNormalizer.normalize(email);
    if (normalized == null || normalized.isBlank()) {
      throw new ApiException(HttpStatus.BAD_REQUEST, "VALIDATION_ERROR", "Invalid request");
    }
    if (appUserRepository.findByNormalizedEmail(normalized).isPresent()) {
      throw new ApiException(HttpStatus.CONFLICT, EMAIL_TAKEN_CODE, EMAIL_TAKEN_MESSAGE);
    }

    Instant now = Instant.now(clock);
    String trimmedName = businessName.trim();
    Tenant tenant = new Tenant();
    tenant.setId(UUID.randomUUID());
    tenant.setName(trimmedName);
    tenant.setSlug(uniqueSlug(trimmedName));
    tenant.setStatus(TenantStatus.VERIFICATION_REQUIRED);
    tenant.setEmailVerifiedAt(null);
    tenant.setCreatedAt(now);
    tenant.setUpdatedAt(now);
    tenantRepository.saveAndFlush(tenant);

    AppUser owner = new AppUser();
    owner.setId(UUID.randomUUID());
    owner.setTenantId(tenant.getId());
    owner.setEmail(normalized);
    owner.setPhone(phone.trim());
    owner.setPasswordHash(passwordEncoder.encode(password));
    owner.setDisplayName(trimmedName);
    owner.setRole(AppUserRole.pharmacy_owner);
    owner.setStatus(UserAccountStatus.ACTIVE);
    owner.setActive(true);
    owner.setMustChangePassword(false);
    owner.setPasswordChangedAt(now);
    owner.setCreatedAt(now);
    owner.setUpdatedAt(now);
    appUserRepository.saveAndFlush(owner);

    String rawToken = newRawToken();
    EmailVerificationToken token = new EmailVerificationToken();
    token.setId(UUID.randomUUID());
    token.setTenantId(tenant.getId());
    token.setUserId(owner.getId());
    token.setTokenHash(sha256(rawToken));
    token.setExpiresAt(now.plus(Duration.ofMinutes(verifyTtlMinutes)));
    token.setCreatedAt(now);
    emailVerificationTokenRepository.saveAndFlush(token);

    UUID tenantId = tenant.getId();
    String verifyUrl = verifyUrlFor(rawToken);
    String pharmacyName = trimmedName;
    String recipient = normalized;
    String idempotencyKey = "onboarding-verify-" + owner.getId();
    if (TransactionSynchronizationManager.isSynchronizationActive()) {
      TransactionSynchronizationManager.registerSynchronization(
          new TransactionSynchronization() {
            @Override
            public void afterCommit() {
              sendOnboardingEmail(recipient, tenantId, pharmacyName, verifyUrl, idempotencyKey);
            }
          });
    } else {
      sendOnboardingEmail(recipient, tenantId, pharmacyName, verifyUrl, idempotencyKey);
    }

    return new TenantRegistrationResult(tenant.getId(), normalized);
  }

  private void sendOnboardingEmail(
      String recipient,
      UUID tenantId,
      String pharmacyName,
      String verifyUrl,
      String idempotencyKey) {
    transactionalEmailService.send(
        new SendEmailCommand(
            EmailTemplate.ONBOARDING,
            recipient,
            tenantId,
            pharmacyName,
            Map.of("verifyUrl", verifyUrl),
            idempotencyKey));
  }

  @Transactional
  public TenantVerifyResult verifyEmail(String rawToken) {
    if (rawToken == null || rawToken.isBlank()) {
      throw new ApiException(
          HttpStatus.UNPROCESSABLE_ENTITY, TOKEN_INVALID_CODE, TOKEN_INVALID_MESSAGE);
    }
    Instant now = Instant.now(clock);
    EmailVerificationToken token =
        emailVerificationTokenRepository
            .findByTokenHash(sha256(rawToken.trim()))
            .orElseThrow(
                () ->
                    new ApiException(
                        HttpStatus.UNPROCESSABLE_ENTITY,
                        TOKEN_INVALID_CODE,
                        TOKEN_INVALID_MESSAGE));
    if (token.getConsumedAt() != null || !token.getExpiresAt().isAfter(now)) {
      throw new ApiException(
          HttpStatus.UNPROCESSABLE_ENTITY, TOKEN_INVALID_CODE, TOKEN_INVALID_MESSAGE);
    }

    Tenant tenant =
        tenantRepository
            .lockById(token.getTenantId())
            .filter(candidate -> candidate.getDeletedAt() == null)
            .orElseThrow(
                () ->
                    new ApiException(
                        HttpStatus.UNPROCESSABLE_ENTITY,
                        TOKEN_INVALID_CODE,
                        TOKEN_INVALID_MESSAGE));
    AppUser owner =
        appUserRepository
            .findById(token.getUserId())
            .filter(candidate -> candidate.getDeletedAt() == null)
            .orElseThrow(
                () ->
                    new ApiException(
                        HttpStatus.UNPROCESSABLE_ENTITY,
                        TOKEN_INVALID_CODE,
                        TOKEN_INVALID_MESSAGE));

    token.setConsumedAt(now);
    emailVerificationTokenRepository.save(token);

    if (tenant.getEmailVerifiedAt() == null) {
      tenant.setEmailVerifiedAt(now);
      tenant.setUpdatedAt(now);
      tenantRepository.save(tenant);
    }

    return new TenantVerifyResult(tenant.getId(), owner.getEmail());
  }

  private String uniqueSlug(String businessName) {
    String base = TenantSlug.fromBusinessName(businessName);
    String candidate = base;
    int suffix = 2;
    while (tenantRepository.existsBySlug(candidate)) {
      String suffixText = "-" + suffix;
      int maxBase = Math.max(1, 100 - suffixText.length());
      candidate = base.substring(0, Math.min(base.length(), maxBase)) + suffixText;
      suffix++;
    }
    return candidate;
  }

  private String verifyUrlFor(String rawToken) {
    String join = dispensaryVerifyUrl.contains("?") ? "&" : "?";
    return dispensaryVerifyUrl + join + "token=" + rawToken;
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

  private static void requireBusinessName(String businessName) {
    if (businessName == null || businessName.isBlank()) {
      throw new ApiException(HttpStatus.BAD_REQUEST, "VALIDATION_ERROR", "Invalid request");
    }
  }

  private static void requirePhone(String phone) {
    if (phone == null || phone.isBlank()) {
      throw new ApiException(HttpStatus.BAD_REQUEST, "VALIDATION_ERROR", "Invalid request");
    }
  }

  private static void requirePassword(String password) {
    if (!PasswordPolicy.meetsMinimumLength(password)) {
      throw new ApiException(HttpStatus.BAD_REQUEST, "VALIDATION_ERROR", "Invalid request");
    }
  }
}
