package com.nammamedmate.server.application.staff;

import com.nammamedmate.server.application.subscription.SubscriptionService;
import com.nammamedmate.server.domain.AppUser;
import com.nammamedmate.server.domain.AppUserRole;
import com.nammamedmate.server.domain.EmailNormalizer;
import com.nammamedmate.server.domain.PasswordPolicy;
import com.nammamedmate.server.domain.StaffLicenseRules;
import com.nammamedmate.server.domain.StaffRegistration;
import com.nammamedmate.server.domain.StaffRegistrationStatus;
import com.nammamedmate.server.domain.StaffRolePolicy;
import com.nammamedmate.server.domain.UserAccountStatus;
import com.nammamedmate.server.infrastructure.security.AuthPrincipal;
import com.nammamedmate.server.persistence.AppUserRepository;
import com.nammamedmate.server.persistence.StaffRegistrationRepository;
import com.nammamedmate.server.persistence.TenantRepository;
import com.nammamedmate.server.persistence.UserSessionRepository;
import com.nammamedmate.server.shared.exception.ApiException;
import java.time.Clock;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class StaffOnboardingService {

  static final String NOT_FOUND_CODE = "NOT_FOUND";
  static final String NOT_FOUND_MESSAGE = "Account not found.";
  static final String PLAN_LIMIT_CODE = "PLAN_LIMIT";
  static final String PLAN_LIMIT_MESSAGE = "This pharmacy has reached its staff limit.";
  static final String EMAIL_TAKEN_CODE = "EMAIL_TAKEN";
  static final String EMAIL_TAKEN_MESSAGE = "This email is already in use.";
  static final String INVALID_LICENSE_CODE = "INVALID_LICENSE";
  static final String INVALID_LICENSE_MESSAGE = "A pharmacist licence number is required.";
  static final String PRIVILEGE_CODE = "PRIVILEGE_ESCALATION";
  static final String PRIVILEGE_MESSAGE = "That role cannot be granted.";
  static final String VERIFICATION_CONFLICT_CODE = "VERIFICATION_CONFLICT";
  static final String VERIFICATION_CONFLICT_MESSAGE = "This registration was already decided.";
  static final String DEACTIVATED_CODE = "STAFF_DEACTIVATED";
  static final String DEACTIVATED_MESSAGE = "This account is already offboarded.";

  private final AppUserRepository appUserRepository;
  private final StaffRegistrationRepository staffRegistrationRepository;
  private final TenantRepository tenantRepository;
  private final UserSessionRepository userSessionRepository;
  private final SubscriptionService subscriptionService;
  private final PasswordEncoder passwordEncoder;
  private final Clock clock;

  public StaffOnboardingService(
      AppUserRepository appUserRepository,
      StaffRegistrationRepository staffRegistrationRepository,
      TenantRepository tenantRepository,
      UserSessionRepository userSessionRepository,
      SubscriptionService subscriptionService,
      PasswordEncoder passwordEncoder,
      Clock clock) {
    this.appUserRepository = appUserRepository;
    this.staffRegistrationRepository = staffRegistrationRepository;
    this.tenantRepository = tenantRepository;
    this.userSessionRepository = userSessionRepository;
    this.subscriptionService = subscriptionService;
    this.passwordEncoder = passwordEncoder;
    this.clock = clock;
  }

  @Transactional
  public StaffAccount create(AuthPrincipal principal, CreateStaffCommand command) {
    if (!StaffRolePolicy.canCreate(principal.role())) {
      throw forbidden();
    }
    if (!StaffRolePolicy.canGrant(principal.role(), command.role())) {
      throw new ApiException(HttpStatus.UNPROCESSABLE_ENTITY, PRIVILEGE_CODE, PRIVILEGE_MESSAGE);
    }
    if (!PasswordPolicy.meetsMinimumLength(command.password())) {
      throw new ApiException(HttpStatus.BAD_REQUEST, "VALIDATION_ERROR", "Invalid request");
    }
    if (!StaffLicenseRules.valid(command.kind(), command.licenseNumber())) {
      throw new ApiException(
          HttpStatus.UNPROCESSABLE_ENTITY, INVALID_LICENSE_CODE, INVALID_LICENSE_MESSAGE);
    }

    UUID tenantId = scopedTenantForCreate(principal);
    String email = EmailNormalizer.normalize(command.email());
    if (appUserRepository.findByNormalizedEmail(email).isPresent()) {
      throw new ApiException(HttpStatus.CONFLICT, EMAIL_TAKEN_CODE, EMAIL_TAKEN_MESSAGE);
    }
    if (tenantId != null) {
      tenantRepository.lockById(tenantId).orElseThrow(StaffOnboardingService::notFound);
      subscriptionService.assertCanAddUser(tenantId);
    }

    Instant now = Instant.now(clock);
    AppUser user = new AppUser();
    user.setId(UUID.randomUUID());
    user.setTenantId(tenantId);
    user.setEmail(email);
    user.setPhone(command.phone().trim());
    user.setPasswordHash(passwordEncoder.encode(command.password()));
    user.setDisplayName(command.displayName().trim());
    user.setRole(command.role());
    user.setStatus(UserAccountStatus.PENDING);
    user.setActive(false);
    user.setMustChangePassword(true);
    user.setPasswordChangedAt(now);
    user.setCreatedBy(principal.userId());
    user.setCreatedAt(now);
    user.setUpdatedAt(now);
    appUserRepository.saveAndFlush(user);

    StaffRegistration registration = new StaffRegistration();
    registration.setId(UUID.randomUUID());
    registration.setTenantId(tenantId);
    registration.setUserId(user.getId());
    registration.setKind(command.kind());
    registration.setLicenseNumber(StaffLicenseRules.normalized(command.licenseNumber()));
    registration.setStatus(StaffRegistrationStatus.PENDING);
    registration.setCreatedAt(now);
    staffRegistrationRepository.saveAndFlush(registration);
    return toAccount(user, registration);
  }

  @Transactional(readOnly = true)
  public StaffAccountList list(AuthPrincipal principal) {
    List<AppUser> users;
    if (principal.role() == AppUserRole.pharmacy_owner) {
      users =
          appUserRepository.findByTenantIdAndDeletedAtIsNullOrderByCreatedAtAsc(
              principal.tenantId());
    } else if (principal.role() == AppUserRole.admin_super) {
      users = appUserRepository.findByTenantIdIsNullAndDeletedAtIsNullOrderByCreatedAtAsc();
    } else {
      throw forbidden();
    }
    Map<UUID, StaffRegistration> registrations =
        staffRegistrationRepository
            .findByUserIdIn(users.stream().map(AppUser::getId).toList())
            .stream()
            .collect(Collectors.toMap(StaffRegistration::getUserId, Function.identity()));
    return new StaffAccountList(
        users.stream().map(user -> toAccount(user, registrations.get(user.getId()))).toList());
  }

  @Transactional
  public StaffAccount deactivate(AuthPrincipal principal, UUID userId) {
    if (!StaffRolePolicy.canCreate(principal.role())) {
      throw forbidden();
    }
    AppUser user = appUserRepository.lockById(userId).orElseThrow(StaffOnboardingService::notFound);
    if (!manageable(principal, user)) {
      throw notFound();
    }
    if (user.getDeletedAt() != null || user.getStatus() == UserAccountStatus.TERMINATED) {
      throw new ApiException(HttpStatus.CONFLICT, DEACTIVATED_CODE, DEACTIVATED_MESSAGE);
    }
    Instant now = Instant.now(clock);
    user.setDeletedAt(now);
    user.setStatus(UserAccountStatus.TERMINATED);
    user.setActive(false);
    user.setUpdatedAt(now);
    userSessionRepository.revokeActiveSessions(user.getId(), now);
    StaffRegistration registration =
        staffRegistrationRepository.findByUserId(user.getId()).orElse(null);
    return toAccount(user, registration);
  }

  @Transactional(readOnly = true)
  public StaffVerificationList listPendingVerifications(AuthPrincipal principal) {
    requireVerifier(principal);
    List<StaffRegistration> pending =
        staffRegistrationRepository.findByStatusOrderByCreatedAtAsc(
            StaffRegistrationStatus.PENDING);
    Map<UUID, AppUser> users =
        appUserRepository
            .findAllById(pending.stream().map(StaffRegistration::getUserId).toList())
            .stream()
            .collect(Collectors.toMap(AppUser::getId, Function.identity()));
    return new StaffVerificationList(
        pending.stream()
            .map(row -> toVerification(row, users.get(row.getUserId())))
            .filter(Objects::nonNull)
            .toList());
  }

  @Transactional
  public StaffVerification approve(
      AuthPrincipal principal, UUID registrationId, String evidenceReference) {
    requireVerifier(principal);
    StaffRegistration registration =
        staffRegistrationRepository
            .lockById(registrationId)
            .orElseThrow(StaffOnboardingService::notFound);
    if (registration.getStatus() != StaffRegistrationStatus.PENDING) {
      throw new ApiException(
          HttpStatus.CONFLICT, VERIFICATION_CONFLICT_CODE, VERIFICATION_CONFLICT_MESSAGE);
    }
    AppUser user =
        appUserRepository
            .lockById(registration.getUserId())
            .filter(candidate -> candidate.getDeletedAt() == null)
            .orElseThrow(StaffOnboardingService::notFound);
    Instant now = Instant.now(clock);
    registration.setStatus(StaffRegistrationStatus.APPROVED);
    registration.setEvidenceReference(evidenceReference.trim());
    registration.setReviewedBy(principal.userId());
    registration.setReviewedAt(now);
    user.setStatus(UserAccountStatus.ACTIVE);
    user.setActive(true);
    user.setUpdatedAt(now);
    return toVerification(registration, user);
  }

  private UUID scopedTenantForCreate(AuthPrincipal principal) {
    if (principal.role() == AppUserRole.pharmacy_owner) {
      if (principal.tenantId() == null) {
        throw forbidden();
      }
      return principal.tenantId();
    }
    return null;
  }

  private boolean manageable(AuthPrincipal principal, AppUser user) {
    if (Objects.equals(user.getId(), principal.userId())) {
      return false;
    }
    if (user.getRole() == AppUserRole.pharmacy_owner || user.getRole() == AppUserRole.admin_super) {
      return false;
    }
    if (principal.role() == AppUserRole.pharmacy_owner) {
      return Objects.equals(user.getTenantId(), principal.tenantId())
          && Objects.equals(user.getCreatedBy(), principal.userId());
    }
    return user.getTenantId() == null && Objects.equals(user.getCreatedBy(), principal.userId());
  }

  private static void requireVerifier(AuthPrincipal principal) {
    if (!StaffRolePolicy.canVerify(principal.role())) {
      throw forbidden();
    }
  }

  private StaffAccount toAccount(AppUser user, StaffRegistration registration) {
    return new StaffAccount(
        user.getId(),
        user.getEmail(),
        user.getDisplayName(),
        user.getPhone(),
        user.getRole(),
        user.getStatus(),
        registration == null ? null : registration.getKind(),
        registration == null ? null : registration.getLicenseNumber(),
        registration == null ? null : registration.getId(),
        user.getCreatedBy(),
        user.isMustChangePassword(),
        user.getCreatedAt());
  }

  private StaffVerification toVerification(StaffRegistration registration, AppUser user) {
    if (user == null) {
      return null;
    }
    return new StaffVerification(
        registration.getId(),
        user.getId(),
        registration.getTenantId(),
        user.getEmail(),
        user.getDisplayName(),
        registration.getKind(),
        registration.getLicenseNumber(),
        registration.getEvidenceReference(),
        registration.getStatus(),
        registration.getReviewedBy(),
        registration.getReviewedAt(),
        registration.getCreatedAt());
  }

  private static ApiException notFound() {
    return new ApiException(HttpStatus.NOT_FOUND, NOT_FOUND_CODE, NOT_FOUND_MESSAGE);
  }

  private static ApiException forbidden() {
    return new ApiException(HttpStatus.FORBIDDEN, "FORBIDDEN", "Access denied");
  }
}
