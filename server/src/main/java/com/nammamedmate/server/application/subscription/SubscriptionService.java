package com.nammamedmate.server.application.subscription;

import com.nammamedmate.server.domain.AppUserRole;
import com.nammamedmate.server.domain.PlanCatalogue;
import com.nammamedmate.server.domain.PlanCode;
import com.nammamedmate.server.domain.PlanLimits;
import com.nammamedmate.server.domain.PlanModuleEntitlements;
import com.nammamedmate.server.domain.SubscriptionOverrideEvent;
import com.nammamedmate.server.domain.SubscriptionStatus;
import com.nammamedmate.server.domain.SubscriptionUpgradeIntent;
import com.nammamedmate.server.domain.Tenant;
import com.nammamedmate.server.domain.TenantSubscription;
import com.nammamedmate.server.domain.UpgradeIntentStatus;
import com.nammamedmate.server.infrastructure.security.AuthPrincipal;
import com.nammamedmate.server.persistence.AppUserRepository;
import com.nammamedmate.server.persistence.LocationRepository;
import com.nammamedmate.server.persistence.SubscriptionOverrideEventRepository;
import com.nammamedmate.server.persistence.SubscriptionUpgradeIntentRepository;
import com.nammamedmate.server.persistence.TenantRepository;
import com.nammamedmate.server.persistence.TenantSubscriptionRepository;
import com.nammamedmate.server.shared.exception.ApiException;
import java.time.Clock;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class SubscriptionService {

  static final String PLAN_LIMIT_CODE = "PLAN_LIMIT";
  static final String BRANCH_LIMIT_MESSAGE =
      "This pharmacy has reached its outlet limit. Upgrade the plan to add another outlet.";
  static final String USER_LIMIT_MESSAGE =
      "This pharmacy has reached its staff limit. Upgrade the plan to add another till login.";
  static final String DOWNGRADE_CONFLICT_CODE = "DOWNGRADE_CONFLICT";
  static final String DOWNGRADE_CONFLICT_MESSAGE =
      "Current outlets or till logins exceed the target plan. Reduce usage before changing plan.";

  private final TenantSubscriptionRepository tenantSubscriptionRepository;
  private final SubscriptionUpgradeIntentRepository upgradeIntentRepository;
  private final SubscriptionOverrideEventRepository overrideEventRepository;
  private final TenantRepository tenantRepository;
  private final AppUserRepository appUserRepository;
  private final LocationRepository locationRepository;
  private final Clock clock;

  public SubscriptionService(
      TenantSubscriptionRepository tenantSubscriptionRepository,
      SubscriptionUpgradeIntentRepository upgradeIntentRepository,
      SubscriptionOverrideEventRepository overrideEventRepository,
      TenantRepository tenantRepository,
      AppUserRepository appUserRepository,
      LocationRepository locationRepository,
      Clock clock) {
    this.tenantSubscriptionRepository = tenantSubscriptionRepository;
    this.upgradeIntentRepository = upgradeIntentRepository;
    this.overrideEventRepository = overrideEventRepository;
    this.tenantRepository = tenantRepository;
    this.appUserRepository = appUserRepository;
    this.locationRepository = locationRepository;
    this.clock = clock;
  }

  @Transactional(readOnly = true)
  public List<PlanCatalogue.PlanOffer> catalogue(AuthPrincipal principal) {
    requireOwner(principal);
    return PlanCatalogue.all();
  }

  @Transactional(readOnly = true)
  public SubscriptionCurrentView current(AuthPrincipal principal) {
    UUID tenantId = requireOwner(principal);
    TenantSubscription subscription =
        tenantSubscriptionRepository
            .findByTenantId(tenantId)
            .orElseGet(() -> newFreeSubscription(tenantId));
    return toCurrentView(subscription, tenantId);
  }

  @Transactional
  public SubscriptionCurrentView upgrade(
      AuthPrincipal principal, PlanCode targetPlan, String idempotencyKey) {
    UUID tenantId = requireOwner(principal);
    if (targetPlan == null) {
      throw new ApiException(HttpStatus.BAD_REQUEST, "VALIDATION_ERROR", "Invalid request");
    }
    String key = requireIdempotencyKey(idempotencyKey);
    var existing = upgradeIntentRepository.findByIdempotencyKey(key);
    if (existing.isPresent()) {
      SubscriptionUpgradeIntent prior = existing.get();
      if (!prior.getTenantId().equals(tenantId) || prior.getTargetPlan() != targetPlan) {
        throw new ApiException(
            HttpStatus.CONFLICT, "IDEMPOTENCY_CONFLICT", "Idempotency key already used.");
      }
      return toCurrentView(requireSubscription(tenantId), tenantId);
    }

    TenantSubscription subscription = requireSubscription(tenantId);
    assertUsageFits(tenantId, targetPlan, subscription.getBranchLimitOverride());

    Instant now = Instant.now(clock);
    SubscriptionUpgradeIntent intent = new SubscriptionUpgradeIntent();
    intent.setId(UUID.randomUUID());
    intent.setTenantId(tenantId);
    intent.setTargetPlan(targetPlan);
    intent.setStatus(UpgradeIntentStatus.APPLIED);
    intent.setIdempotencyKey(key);
    intent.setAppliedAt(now);
    intent.setCreatedAt(now);
    intent.setUpdatedAt(now);
    upgradeIntentRepository.save(intent);

    subscription.setPlanCode(targetPlan);
    if (targetPlan == PlanCode.FREE) {
      subscription.setExpiresAt(null);
    }
    subscription.setStatus(SubscriptionStatus.ACTIVE);
    subscription.setUpdatedAt(now);
    tenantSubscriptionRepository.save(subscription);
    return toCurrentView(subscription, tenantId);
  }

  @Transactional
  public SubscriptionCurrentView paymentCallback(
      AuthPrincipal principal, UUID intentId, String idempotencyKey) {
    UUID tenantId = requireOwner(principal);
    String key = requireIdempotencyKey(idempotencyKey);
    SubscriptionUpgradeIntent intent =
        upgradeIntentRepository
            .findById(intentId)
            .filter(row -> row.getTenantId().equals(tenantId))
            .orElseThrow(
                () ->
                    new ApiException(
                        HttpStatus.NOT_FOUND, "NOT_FOUND", "Upgrade intent not found."));

    if (intent.getStatus() == UpgradeIntentStatus.APPLIED) {
      return toCurrentView(requireSubscription(tenantId), tenantId);
    }

    var priorKey = upgradeIntentRepository.findByIdempotencyKey(key);
    if (priorKey.isPresent() && !priorKey.get().getId().equals(intent.getId())) {
      throw new ApiException(
          HttpStatus.CONFLICT, "IDEMPOTENCY_CONFLICT", "Idempotency key already used.");
    }

    TenantSubscription subscription = requireSubscription(tenantId);
    assertUsageFits(tenantId, intent.getTargetPlan(), subscription.getBranchLimitOverride());

    Instant now = Instant.now(clock);
    intent.setStatus(UpgradeIntentStatus.APPLIED);
    intent.setAppliedAt(now);
    intent.setUpdatedAt(now);
    if (intent.getIdempotencyKey() == null || intent.getIdempotencyKey().isBlank()) {
      intent.setIdempotencyKey(key);
    }
    upgradeIntentRepository.save(intent);

    subscription.setPlanCode(intent.getTargetPlan());
    subscription.setStatus(SubscriptionStatus.ACTIVE);
    subscription.setUpdatedAt(now);
    tenantSubscriptionRepository.save(subscription);
    return toCurrentView(subscription, tenantId);
  }

  @Transactional(readOnly = true)
  public List<TenantSubscriptionSummary> listForAdmin(AuthPrincipal principal) {
    requireMaster(principal);
    return tenantRepository.findAllByDeletedAtIsNullOrderByNameAsc().stream()
        .map(
            tenant -> {
              TenantSubscription sub =
                  tenantSubscriptionRepository.findByTenantId(tenant.getId()).orElse(null);
              if (sub == null) {
                return new TenantSubscriptionSummary(
                    tenant.getId(),
                    tenant.getName(),
                    PlanCode.FREE,
                    SubscriptionStatus.ACTIVE,
                    null,
                    null,
                    PlanLimits.maxBranches(PlanCode.FREE),
                    PlanLimits.maxUsers(PlanCode.FREE),
                    countUsers(tenant.getId()),
                    countBranches(tenant.getId()));
              }
              return toSummary(tenant, sub);
            })
        .toList();
  }

  @Transactional
  public SubscriptionCurrentView override(
      AuthPrincipal principal,
      UUID tenantId,
      PlanCode planCode,
      SubscriptionStatus status,
      Instant expiresAt,
      Integer branchLimitOverride,
      String reason) {
    requireMaster(principal);
    if (planCode == null || status == null || reason == null || reason.isBlank()) {
      throw new ApiException(HttpStatus.BAD_REQUEST, "VALIDATION_ERROR", "Invalid request");
    }
    Tenant tenant =
        tenantRepository
            .findById(tenantId)
            .filter(t -> t.getDeletedAt() == null)
            .orElseThrow(
                () -> new ApiException(HttpStatus.NOT_FOUND, "NOT_FOUND", "Tenant not found"));

    TenantSubscription subscription =
        tenantSubscriptionRepository
            .findByTenantId(tenantId)
            .orElseGet(() -> newFreeSubscription(tenantId));

    assertUsageFits(tenantId, planCode, branchLimitOverride);

    Instant now = Instant.now(clock);
    SubscriptionOverrideEvent event = new SubscriptionOverrideEvent();
    event.setId(UUID.randomUUID());
    event.setTenantId(tenantId);
    event.setActorUserId(principal.userId());
    event.setBeforePlan(subscription.getPlanCode());
    event.setAfterPlan(planCode);
    event.setBeforeStatus(subscription.getStatus());
    event.setAfterStatus(status);
    event.setBeforeExpiresAt(subscription.getExpiresAt());
    event.setAfterExpiresAt(expiresAt);
    event.setBeforeBranchLimitOverride(subscription.getBranchLimitOverride());
    event.setAfterBranchLimitOverride(branchLimitOverride);
    event.setReason(reason.trim());
    event.setCreatedAt(now);
    overrideEventRepository.save(event);

    subscription.setPlanCode(planCode);
    subscription.setStatus(status);
    subscription.setExpiresAt(expiresAt);
    subscription.setBranchLimitOverride(branchLimitOverride);
    subscription.setUpdatedAt(now);
    if (subscription.getStartedAt() == null) {
      subscription.setStartedAt(now);
    }
    if (subscription.getCreatedAt() == null) {
      subscription.setCreatedAt(now);
    }
    tenantSubscriptionRepository.save(subscription);
    return toCurrentView(subscription, tenant.getId());
  }

  @Transactional(readOnly = true)
  public List<OverrideEventView> overrideHistory(AuthPrincipal principal, UUID tenantId) {
    requireMaster(principal);
    if (tenantRepository.findById(tenantId).filter(t -> t.getDeletedAt() == null).isEmpty()) {
      throw new ApiException(HttpStatus.NOT_FOUND, "NOT_FOUND", "Tenant not found");
    }
    return overrideEventRepository.findByTenantIdOrderByCreatedAtDesc(tenantId).stream()
        .map(
            e ->
                new OverrideEventView(
                    e.getId(),
                    e.getTenantId(),
                    e.getActorUserId(),
                    e.getBeforePlan(),
                    e.getAfterPlan(),
                    e.getBeforeStatus(),
                    e.getAfterStatus(),
                    e.getBeforeExpiresAt(),
                    e.getAfterExpiresAt(),
                    e.getBeforeBranchLimitOverride(),
                    e.getAfterBranchLimitOverride(),
                    e.getReason(),
                    e.getCreatedAt()))
        .toList();
  }

  @Transactional(readOnly = true)
  public PlanCode resolvePlan(UUID tenantId) {
    if (tenantId == null) {
      return PlanCode.FREE;
    }
    return tenantSubscriptionRepository
        .findByTenantId(tenantId)
        .map(TenantSubscription::getPlanCode)
        .orElse(PlanCode.FREE);
  }

  public void assertCanAddBranch(UUID tenantId) {
    TenantSubscription subscription =
        tenantSubscriptionRepository.findByTenantId(tenantId).orElse(null);
    PlanCode plan = subscription == null ? PlanCode.FREE : subscription.getPlanCode();
    Integer override = subscription == null ? null : subscription.getBranchLimitOverride();
    long current = countBranches(tenantId);
    if (!PlanLimits.allowsAnotherBranch(plan, override, current)) {
      throw new ApiException(
          HttpStatus.UNPROCESSABLE_ENTITY, PLAN_LIMIT_CODE, BRANCH_LIMIT_MESSAGE);
    }
  }

  public void assertCanAddUser(UUID tenantId) {
    TenantSubscription subscription =
        tenantSubscriptionRepository.findByTenantId(tenantId).orElse(null);
    PlanCode plan = subscription == null ? PlanCode.FREE : subscription.getPlanCode();
    long current = countUsers(tenantId);
    if (!PlanLimits.allowsAnotherUser(plan, current)) {
      throw new ApiException(HttpStatus.UNPROCESSABLE_ENTITY, PLAN_LIMIT_CODE, USER_LIMIT_MESSAGE);
    }
  }

  private void assertUsageFits(UUID tenantId, PlanCode plan, Integer branchLimitOverride) {
    long users = countUsers(tenantId);
    long branches = countBranches(tenantId);
    if (!PlanLimits.usageFitsPlan(plan, branchLimitOverride, users, branches)) {
      throw new ApiException(
          HttpStatus.CONFLICT, DOWNGRADE_CONFLICT_CODE, DOWNGRADE_CONFLICT_MESSAGE);
    }
  }

  private SubscriptionCurrentView toCurrentView(TenantSubscription subscription, UUID tenantId) {
    PlanCode plan = subscription.getPlanCode();
    int branchLimit = PlanLimits.effectiveBranchLimit(plan, subscription.getBranchLimitOverride());
    int maxUsers = PlanLimits.maxUsers(plan);
    return new SubscriptionCurrentView(
        tenantId,
        plan,
        subscription.getStatus(),
        subscription.getStartedAt(),
        subscription.getExpiresAt(),
        subscription.getBranchLimitOverride(),
        branchLimit,
        maxUsers,
        countUsers(tenantId),
        countBranches(tenantId),
        List.copyOf(PlanModuleEntitlements.entitledTenantModules(plan)));
  }

  private TenantSubscriptionSummary toSummary(Tenant tenant, TenantSubscription subscription) {
    PlanCode plan = subscription.getPlanCode();
    return new TenantSubscriptionSummary(
        tenant.getId(),
        tenant.getName(),
        plan,
        subscription.getStatus(),
        subscription.getExpiresAt(),
        subscription.getBranchLimitOverride(),
        PlanLimits.effectiveBranchLimit(plan, subscription.getBranchLimitOverride()),
        PlanLimits.maxUsers(plan),
        countUsers(tenant.getId()),
        countBranches(tenant.getId()));
  }

  private TenantSubscription newFreeSubscription(UUID tenantId) {
    Instant now = Instant.now(clock);
    TenantSubscription subscription = new TenantSubscription();
    subscription.setId(UUID.randomUUID());
    subscription.setTenantId(tenantId);
    subscription.setPlanCode(PlanCode.FREE);
    subscription.setStatus(SubscriptionStatus.ACTIVE);
    subscription.setStartedAt(now);
    subscription.setCreatedAt(now);
    subscription.setUpdatedAt(now);
    return subscription;
  }

  private TenantSubscription requireSubscription(UUID tenantId) {
    return tenantSubscriptionRepository
        .findByTenantId(tenantId)
        .orElseGet(() -> tenantSubscriptionRepository.save(newFreeSubscription(tenantId)));
  }

  private long countUsers(UUID tenantId) {
    return appUserRepository.countByTenantIdAndDeletedAtIsNull(tenantId);
  }

  private long countBranches(UUID tenantId) {
    return locationRepository.countByTenantIdAndDeletedAtIsNull(tenantId);
  }

  private static String requireIdempotencyKey(String idempotencyKey) {
    if (idempotencyKey == null || idempotencyKey.isBlank()) {
      throw new ApiException(HttpStatus.BAD_REQUEST, "VALIDATION_ERROR", "Invalid request");
    }
    return idempotencyKey.trim();
  }

  private UUID requireOwner(AuthPrincipal principal) {
    if (principal == null
        || principal.role() != AppUserRole.pharmacy_owner
        || principal.tenantId() == null) {
      throw forbidden();
    }
    return principal.tenantId();
  }

  private void requireMaster(AuthPrincipal principal) {
    if (principal == null || principal.role() != AppUserRole.admin_super) {
      throw forbidden();
    }
  }

  private static ApiException forbidden() {
    return new ApiException(HttpStatus.FORBIDDEN, "FORBIDDEN", "Forbidden");
  }
}
