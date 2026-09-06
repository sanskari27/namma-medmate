package com.nammamedmate.server.application.subscription;

import com.nammamedmate.server.application.audit.AuditRecordCommand;
import com.nammamedmate.server.application.audit.AuditService;
import com.nammamedmate.server.domain.AppUserRole;
import com.nammamedmate.server.domain.CashfreeBillingPolicy;
import com.nammamedmate.server.domain.PlanCode;
import com.nammamedmate.server.domain.PlanLimits;
import com.nammamedmate.server.domain.SubscriptionPayment;
import com.nammamedmate.server.domain.SubscriptionPaymentStatus;
import com.nammamedmate.server.domain.SubscriptionUpgradeIntent;
import com.nammamedmate.server.domain.TenantSubscription;
import com.nammamedmate.server.domain.UpgradeIntentStatus;
import com.nammamedmate.server.infrastructure.cashfree.CashfreeCreateOrderRequest;
import com.nammamedmate.server.infrastructure.cashfree.CashfreeOrderResult;
import com.nammamedmate.server.infrastructure.cashfree.CashfreeOrderStatus;
import com.nammamedmate.server.infrastructure.cashfree.CashfreePgAdapter;
import com.nammamedmate.server.infrastructure.security.AuthPrincipal;
import com.nammamedmate.server.persistence.AppUserRepository;
import com.nammamedmate.server.persistence.LocationRepository;
import com.nammamedmate.server.persistence.SubscriptionPaymentRepository;
import com.nammamedmate.server.persistence.SubscriptionUpgradeIntentRepository;
import com.nammamedmate.server.persistence.TenantRepository;
import com.nammamedmate.server.persistence.TenantSubscriptionRepository;
import com.nammamedmate.server.shared.exception.ApiException;
import java.time.Clock;
import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class CashfreeBillingService {

  private final SubscriptionPaymentRepository paymentRepository;
  private final SubscriptionUpgradeIntentRepository intentRepository;
  private final TenantSubscriptionRepository tenantSubscriptionRepository;
  private final TenantRepository tenantRepository;
  private final AppUserRepository appUserRepository;
  private final LocationRepository locationRepository;
  private final CashfreePgAdapter cashfreePgAdapter;
  private final AuditService auditService;
  private final Clock clock;
  private final String returnUrl;

  public CashfreeBillingService(
      SubscriptionPaymentRepository paymentRepository,
      SubscriptionUpgradeIntentRepository intentRepository,
      TenantSubscriptionRepository tenantSubscriptionRepository,
      TenantRepository tenantRepository,
      AppUserRepository appUserRepository,
      LocationRepository locationRepository,
      CashfreePgAdapter cashfreePgAdapter,
      AuditService auditService,
      Clock clock,
      @Value("${app.cashfree.return-url:http://localhost:5173/subscription}") String returnUrl) {
    this.paymentRepository = paymentRepository;
    this.intentRepository = intentRepository;
    this.tenantSubscriptionRepository = tenantSubscriptionRepository;
    this.tenantRepository = tenantRepository;
    this.appUserRepository = appUserRepository;
    this.locationRepository = locationRepository;
    this.cashfreePgAdapter = cashfreePgAdapter;
    this.auditService = auditService;
    this.clock = clock;
    this.returnUrl = returnUrl;
  }

  @Transactional
  public CashfreePaymentView checkout(
      AuthPrincipal principal, PlanCode planCode, String idempotencyKey) {
    UUID tenantId = requireOwner(principal);
    PlanCode plan = CashfreeBillingPolicy.requirePaidPlan(planCode);
    String key = requireIdempotencyKey(idempotencyKey);
    Optional<SubscriptionPayment> existing = paymentRepository.findByIdempotencyKey(key);
    if (existing.isPresent()) {
      SubscriptionPayment prior = existing.get();
      if (!prior.getTenantId().equals(tenantId) || prior.getPlanCode() != plan) {
        throw new ApiException(
            HttpStatus.CONFLICT, "IDEMPOTENCY_CONFLICT", "Idempotency key already used.");
      }
      return toView(prior);
    }
    if (!cashfreePgAdapter.configured()) {
      throw CashfreeBillingPolicy.providerUnavailable();
    }
    TenantSubscription subscription = requireSubscription(tenantId);
    assertUsageFits(tenantId, plan, subscription.getBranchLimitOverride());

    Instant now = Instant.now(clock);
    SubscriptionUpgradeIntent intent = new SubscriptionUpgradeIntent();
    intent.setId(UUID.randomUUID());
    intent.setTenantId(tenantId);
    intent.setTargetPlan(plan);
    intent.setStatus(UpgradeIntentStatus.PENDING);
    intent.setIdempotencyKey(key);
    intent.setCreatedAt(now);
    intent.setUpdatedAt(now);
    intentRepository.save(intent);

    String orderId = "nmm_" + UUID.randomUUID().toString().replace("-", "");
    int amountPaise = CashfreeBillingPolicy.amountPaise(plan);
    CashfreeOrderResult order;
    try {
      order =
          cashfreePgAdapter.createOrder(
              new CashfreeCreateOrderRequest(orderId, tenantId, plan, amountPaise, returnUrl));
    } catch (RuntimeException ex) {
      throw CashfreeBillingPolicy.providerUnavailable();
    }
    if (order == null || order.orderId() == null || order.orderId().isBlank()) {
      throw CashfreeBillingPolicy.providerUnavailable();
    }

    SubscriptionPayment payment = new SubscriptionPayment();
    payment.setId(UUID.randomUUID());
    payment.setTenantId(tenantId);
    payment.setUpgradeIntentId(intent.getId());
    payment.setPlanCode(plan);
    payment.setAmountPaise(amountPaise);
    payment.setCurrency("INR");
    payment.setProvider(CashfreeBillingPolicy.PROVIDER);
    payment.setProviderOrderId(order.orderId());
    payment.setPaymentSessionId(order.paymentSessionId());
    payment.setCheckoutUrl(order.checkoutUrl());
    payment.setStatus(SubscriptionPaymentStatus.PENDING);
    payment.setIdempotencyKey(key);
    payment.setCreatedAt(now);
    payment.setUpdatedAt(now);
    paymentRepository.save(payment);
    audit(
        principal.userId(),
        tenantId,
        principal.sessionId(),
        CashfreeBillingPolicy.AUDIT_CHECKOUT,
        payment.getId());
    return toView(payment);
  }

  @Transactional
  public CashfreePaymentView reconcile(AuthPrincipal principal, UUID paymentId) {
    UUID tenantId = requireOwner(principal);
    SubscriptionPayment payment =
        paymentRepository
            .lockByIdAndTenantId(paymentId, tenantId)
            .orElseThrow(CashfreeBillingPolicy::notFound);
    return finishReconcile(payment);
  }

  @Transactional
  public CashfreePaymentView reconcileByOrder(AuthPrincipal principal, String orderId) {
    UUID tenantId = requireOwner(principal);
    if (orderId == null || orderId.isBlank()) {
      throw CashfreeBillingPolicy.shape();
    }
    SubscriptionPayment payment =
        paymentRepository
            .lockByProviderOrderId(orderId.trim())
            .filter(row -> row.getTenantId().equals(tenantId))
            .orElseThrow(CashfreeBillingPolicy::notFound);
    return finishReconcile(payment);
  }

  private CashfreePaymentView finishReconcile(SubscriptionPayment payment) {
    if (payment.getStatus() != SubscriptionPaymentStatus.PENDING) {
      return toView(payment);
    }
    Optional<CashfreeOrderStatus> fetched = cashfreePgAdapter.fetchOrder(payment.getProviderOrderId());
    if (fetched.isEmpty()) {
      return toView(payment);
    }
    CashfreeOrderStatus order = fetched.get();
    String status = order.status() == null ? "" : order.status().toUpperCase();
    if (status.equals("PAID") || status.equals("SUCCESS")) {
      applySuccess(payment, order.amountRupees(), null, Map.of("source", "reconcile"));
    } else if (status.equals("EXPIRED") || status.equals("TERMINATED") || status.equals("USER_DROPPED")) {
      mark(payment, SubscriptionPaymentStatus.ABANDONED, null, false);
    }
    return toView(payment);
  }

  @Transactional
  public CashfreePaymentView applyCallback(CashfreeCallbackCommand command) {
    if (command == null || command.orderId() == null || command.orderId().isBlank()) {
      throw CashfreeBillingPolicy.shape();
    }
    SubscriptionPayment payment =
        paymentRepository
            .lockByProviderOrderId(command.orderId())
            .orElseThrow(CashfreeBillingPolicy::notFound);
    try {
      CashfreeBillingPolicy.requireMatchingTenant(payment.getTenantId(), command.tenantTag());
    } catch (ApiException ex) {
      fail(payment, ex.getCode(), command, true);
      return toView(payment);
    }
    if (command.planTag() != null
        && !command.planTag().isBlank()
        && !command.planTag().equals(payment.getPlanCode().name())) {
      fail(payment, CashfreeBillingPolicy.TENANT_MISMATCH, command, true);
      return toView(payment);
    }

    String type = command.type() == null ? "" : command.type().toUpperCase();
    if (type.contains("FAIL")) {
      fail(payment, "PROVIDER_FAILED", command, true);
      return toView(payment);
    }
    if (type.contains("DROP") || type.contains("EXPIRE") || type.contains("USER_DROPPED")) {
      mark(payment, SubscriptionPaymentStatus.ABANDONED, snapshot(command), true);
      return toView(payment);
    }
    if (!type.contains("SUCCESS") && !type.contains("PAID")) {
      return toView(payment);
    }
    try {
      applySuccess(payment, command.amountRupees(), command.paymentId(), snapshot(command));
    } catch (ApiException ex) {
      if (CashfreeBillingPolicy.AMOUNT_MISMATCH.equals(ex.getCode())
          || CashfreeBillingPolicy.TENANT_MISMATCH.equals(ex.getCode())) {
        fail(payment, ex.getCode(), command, true);
        return toView(payment);
      }
      throw ex;
    }
    payment.setSignatureVerified(true);
    paymentRepository.save(payment);
    return toView(payment);
  }

  @Transactional(readOnly = true)
  public List<AdminCashfreePaymentView> listForAdmin(AuthPrincipal principal) {
    requireMaster(principal);
    Instant now = Instant.now(clock);
    Map<UUID, String> names = new LinkedHashMap<>();
    tenantRepository
        .findAllByDeletedAtIsNullOrderByNameAsc()
        .forEach(tenant -> names.put(tenant.getId(), tenant.getName()));
    return paymentRepository.findAllByOrderByCreatedAtDesc().stream()
        .map(
            payment ->
                new AdminCashfreePaymentView(
                    payment.getId(),
                    payment.getTenantId(),
                    names.getOrDefault(payment.getTenantId(), "Unknown pharmacy"),
                    payment.getPlanCode(),
                    payment.getAmountPaise(),
                    payment.getStatus(),
                    payment.getErrorCode(),
                    CashfreeBillingPolicy.isException(
                        payment.getStatus(), payment.getCreatedAt(), now),
                    payment.getCreatedAt()))
        .toList();
  }

  private void applySuccess(
      SubscriptionPayment payment,
      java.math.BigDecimal amountRupees,
      String providerPaymentId,
      Map<String, Object> snapshot) {
    if (payment.getStatus() == SubscriptionPaymentStatus.SUCCESS) {
      return;
    }
    CashfreeBillingPolicy.requireMatchingAmount(payment.getAmountPaise(), amountRupees);
    Instant now = Instant.now(clock);
    SubscriptionUpgradeIntent intent =
        intentRepository
            .lockByIdAndTenantId(payment.getUpgradeIntentId(), payment.getTenantId())
            .orElseThrow(CashfreeBillingPolicy::notFound);
    TenantSubscription subscription =
        tenantSubscriptionRepository
            .lockByTenantId(payment.getTenantId())
            .orElseGet(() -> requireSubscription(payment.getTenantId()));
    assertUsageFits(
        payment.getTenantId(), payment.getPlanCode(), subscription.getBranchLimitOverride());

    intent.setStatus(UpgradeIntentStatus.APPLIED);
    intent.setAppliedAt(now);
    intent.setUpdatedAt(now);
    intentRepository.save(intent);

    subscription.setPlanCode(payment.getPlanCode());
    subscription.setStatus(com.nammamedmate.server.domain.SubscriptionStatus.ACTIVE);
    subscription.setUpdatedAt(now);
    tenantSubscriptionRepository.save(subscription);

    payment.setStatus(SubscriptionPaymentStatus.SUCCESS);
    payment.setProviderPaymentId(providerPaymentId);
    payment.setPayloadSnapshot(snapshot);
    payment.setErrorCode(null);
    payment.setCompletedAt(now);
    payment.setUpdatedAt(now);
    payment.setSignatureVerified(true);
    paymentRepository.save(payment);
    audit(
        null,
        payment.getTenantId(),
        null,
        CashfreeBillingPolicy.AUDIT_PAYMENT,
        payment.getId());
  }

  private void fail(
      SubscriptionPayment payment,
      String errorCode,
      CashfreeCallbackCommand command,
      boolean verified) {
    if (payment.getStatus() == SubscriptionPaymentStatus.SUCCESS) {
      return;
    }
    mark(payment, SubscriptionPaymentStatus.FAILED, snapshot(command), verified);
    payment.setErrorCode(errorCode);
    paymentRepository.save(payment);
  }

  private void mark(
      SubscriptionPayment payment,
      SubscriptionPaymentStatus status,
      Map<String, Object> snapshot,
      boolean verified) {
    if (payment.getStatus() == SubscriptionPaymentStatus.SUCCESS) {
      return;
    }
    Instant now = Instant.now(clock);
    payment.setStatus(status);
    if (snapshot != null) {
      payment.setPayloadSnapshot(snapshot);
    }
    payment.setSignatureVerified(verified);
    payment.setUpdatedAt(now);
    if (status != SubscriptionPaymentStatus.PENDING) {
      payment.setCompletedAt(now);
    }
    paymentRepository.save(payment);
  }

  private static Map<String, Object> snapshot(CashfreeCallbackCommand command) {
    Map<String, Object> map = new LinkedHashMap<>();
    if (command == null) {
      return map;
    }
    map.put("type", command.type());
    map.put("orderId", command.orderId());
    map.put("paymentId", command.paymentId());
    if (command.amountRupees() != null) {
      map.put("amountRupees", command.amountRupees().toPlainString());
    }
    return map;
  }

  private CashfreePaymentView toView(SubscriptionPayment payment) {
    return new CashfreePaymentView(
        payment.getId(),
        payment.getTenantId(),
        payment.getPlanCode(),
        payment.getAmountPaise(),
        payment.getStatus(),
        payment.getCheckoutUrl(),
        payment.getProviderOrderId(),
        payment.getErrorCode(),
        payment.getCreatedAt());
  }

  private TenantSubscription requireSubscription(UUID tenantId) {
    return tenantSubscriptionRepository
        .findByTenantId(tenantId)
        .orElseGet(
            () -> {
              Instant now = Instant.now(clock);
              TenantSubscription subscription = new TenantSubscription();
              subscription.setId(UUID.randomUUID());
              subscription.setTenantId(tenantId);
              subscription.setPlanCode(PlanCode.FREE);
              subscription.setStatus(com.nammamedmate.server.domain.SubscriptionStatus.ACTIVE);
              subscription.setStartedAt(now);
              subscription.setCreatedAt(now);
              subscription.setUpdatedAt(now);
              return tenantSubscriptionRepository.save(subscription);
            });
  }

  private void assertUsageFits(UUID tenantId, PlanCode plan, Integer branchLimitOverride) {
    long users = appUserRepository.countByTenantIdAndDeletedAtIsNull(tenantId);
    long branches = locationRepository.countByTenantIdAndDeletedAtIsNull(tenantId);
    if (!PlanLimits.usageFitsPlan(plan, branchLimitOverride, users, branches)) {
      throw new ApiException(
          HttpStatus.CONFLICT,
          SubscriptionService.DOWNGRADE_CONFLICT_CODE,
          SubscriptionService.DOWNGRADE_CONFLICT_MESSAGE);
    }
  }

  private static String requireIdempotencyKey(String idempotencyKey) {
    if (idempotencyKey == null || idempotencyKey.isBlank()) {
      throw CashfreeBillingPolicy.shape();
    }
    return idempotencyKey.trim();
  }

  private UUID requireOwner(AuthPrincipal principal) {
    if (principal == null
        || principal.role() != AppUserRole.pharmacy_owner
        || principal.tenantId() == null) {
      throw CashfreeBillingPolicy.forbidden();
    }
    return principal.tenantId();
  }

  private void requireMaster(AuthPrincipal principal) {
    if (principal == null || principal.role() != AppUserRole.admin_super) {
      throw CashfreeBillingPolicy.forbidden();
    }
  }

  private void audit(UUID userId, UUID tenantId, UUID sessionId, String action, UUID recordId) {
    auditService.record(
        new AuditRecordCommand(
            userId,
            tenantId,
            null,
            action,
            AuditService.OUTCOME_SUCCESS,
            null,
            null,
            null,
            sessionId,
            "{\"id\":\"" + recordId + "\"}"));
  }
}
