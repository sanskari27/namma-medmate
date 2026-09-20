package com.nammamedmate.server.application.hospital;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.nammamedmate.server.application.access.AccessQueryService;
import com.nammamedmate.server.application.approval.ApprovalService;
import com.nammamedmate.server.application.approval.CreateApprovalRequestCommand;
import com.nammamedmate.server.application.audit.AuditRecordCommand;
import com.nammamedmate.server.application.audit.AuditService;
import com.nammamedmate.server.application.subscription.SubscriptionService;
import com.nammamedmate.server.domain.AppUser;
import com.nammamedmate.server.domain.AppUserRole;
import com.nammamedmate.server.domain.ApprovalActionKey;
import com.nammamedmate.server.domain.ApprovalRule;
import com.nammamedmate.server.domain.FinanceAccessPolicy;
import com.nammamedmate.server.domain.HospitalCreditAccount;
import com.nammamedmate.server.domain.HospitalCreditTerms;
import com.nammamedmate.server.domain.HospitalPolicy;
import com.nammamedmate.server.domain.HospitalPriceRuleType;
import com.nammamedmate.server.domain.HospitalProductPriceRule;
import com.nammamedmate.server.domain.ModuleCode;
import com.nammamedmate.server.domain.PlanCode;
import com.nammamedmate.server.domain.Product;
import com.nammamedmate.server.domain.SupplierPolicy;
import com.nammamedmate.server.infrastructure.security.AuthPrincipal;
import com.nammamedmate.server.persistence.AppUserRepository;
import com.nammamedmate.server.persistence.HospitalCreditAccountRepository;
import com.nammamedmate.server.persistence.HospitalProductPriceRuleRepository;
import com.nammamedmate.server.persistence.ProductRepository;
import com.nammamedmate.server.shared.exception.ApiException;
import java.time.Clock;
import java.time.Instant;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class HospitalService {

  private final AppUserRepository appUserRepository;
  private final HospitalCreditAccountRepository accountRepository;
  private final HospitalProductPriceRuleRepository priceRuleRepository;
  private final ProductRepository productRepository;
  private final AccessQueryService accessQueryService;
  private final SubscriptionService subscriptionService;
  private final ApprovalService approvalService;
  private final AuditService auditService;
  private final ObjectMapper objectMapper;
  private final Clock clock;

  public HospitalService(
      AppUserRepository appUserRepository,
      HospitalCreditAccountRepository accountRepository,
      HospitalProductPriceRuleRepository priceRuleRepository,
      ProductRepository productRepository,
      AccessQueryService accessQueryService,
      SubscriptionService subscriptionService,
      ApprovalService approvalService,
      AuditService auditService,
      ObjectMapper objectMapper,
      Clock clock) {
    this.appUserRepository = appUserRepository;
    this.accountRepository = accountRepository;
    this.priceRuleRepository = priceRuleRepository;
    this.productRepository = productRepository;
    this.accessQueryService = accessQueryService;
    this.subscriptionService = subscriptionService;
    this.approvalService = approvalService;
    this.auditService = auditService;
    this.objectMapper = objectMapper;
    this.clock = clock;
  }

  @Transactional(readOnly = true)
  public HospitalAccountView getAccount(AuthPrincipal principal) {
    Context ctx = requireRead(principal);
    return accountRepository
        .findByTenantId(ctx.tenantId())
        .map(this::toAccountView)
        .orElse(emptyAccountView());
  }

  @Transactional
  public HospitalAccountView upsertAccount(
      AuthPrincipal principal, HospitalAccountCommand command) {
    Context ctx = requireAccountWriter(principal);
    if (command == null
        || command.institutionName() == null
        || command.institutionName().isBlank()) {
      throw validationError();
    }
    long limit = command.creditLimitPaise() == null ? 0L : command.creditLimitPaise();
    HospitalPolicy.requireNonNegativeLimit(limit);
    HospitalCreditTerms terms = HospitalPolicy.parseTerms(command.creditTerms());
    String gstin = SupplierPolicy.optionalGstin(command.gstin());
    Instant now = clock.instant();
    Optional<HospitalCreditAccount> existing = accountRepository.findByTenantId(ctx.tenantId());
    if (existing.isPresent()) {
      HospitalCreditAccount account = existing.get();
      if (command.expectedVersion() != null && command.expectedVersion() != account.getVersion()) {
        throw staleState();
      }
      account.setInstitutionName(command.institutionName().trim());
      account.setGstin(gstin);
      account.setStoresContact(trimOrNull(command.storesContact()));
      account.setBillingPhone(trimOrNull(command.billingPhone()));
      account.setBillingEmail(trimOrNull(command.billingEmail()));
      account.setCreditTerms(terms);
      account.setCreditLimitPaise(limit);
      account.setVersion(account.getVersion() + 1);
      account.setUpdatedAt(now);
      accountRepository.save(account);
      audit(ctx, "HOSPITAL_ACCOUNT_UPSERT", account.getId());
      return toAccountView(account);
    }
    HospitalCreditAccount account = new HospitalCreditAccount();
    account.setId(UUID.randomUUID());
    account.setTenantId(ctx.tenantId());
    account.setInstitutionName(command.institutionName().trim());
    account.setGstin(gstin);
    account.setStoresContact(trimOrNull(command.storesContact()));
    account.setBillingPhone(trimOrNull(command.billingPhone()));
    account.setBillingEmail(trimOrNull(command.billingEmail()));
    account.setCreditTerms(terms);
    account.setCreditLimitPaise(limit);
    account.setUniformDiscountBps(0);
    account.setBalancePaise(0L);
    account.setVersion(1);
    account.setCreatedAt(now);
    account.setUpdatedAt(now);
    try {
      accountRepository.saveAndFlush(account);
    } catch (DataIntegrityViolationException ex) {
      throw staleState();
    }
    audit(ctx, "HOSPITAL_ACCOUNT_UPSERT", account.getId());
    return toAccountView(account);
  }

  @Transactional(readOnly = true)
  public HospitalPriceListView getPrices(AuthPrincipal principal) {
    Context ctx = requireRead(principal);
    HospitalCreditAccount account =
        accountRepository
            .findByTenantId(ctx.tenantId())
            .orElseThrow(
                () ->
                    new ApiException(
                        HttpStatus.UNPROCESSABLE_ENTITY,
                        HospitalPolicy.ACCOUNT_REQUIRED,
                        "Set up the hospital bill-to account before opening the price list."));
    return buildPriceListView(ctx.tenantId(), account);
  }

  @Transactional
  public HospitalPriceListUpdateResult updatePrices(
      AuthPrincipal principal, HospitalPriceListCommand command) {
    Context ctx = requireRead(principal);
    HospitalCreditAccount account =
        accountRepository
            .lockByTenantId(ctx.tenantId())
            .orElseThrow(
                () ->
                    new ApiException(
                        HttpStatus.UNPROCESSABLE_ENTITY,
                        HospitalPolicy.ACCOUNT_REQUIRED,
                        "Set up the hospital bill-to account before opening the price list."));
    if (command == null || command.uniformDiscountBps() == null) {
      throw validationError();
    }
    HospitalPolicy.requireUniformBps(command.uniformDiscountBps());
    if (command.expectedVersion() != null && command.expectedVersion() != account.getVersion()) {
      throw staleState();
    }
    NormalizedPriceList normalized = normalizePriceList(ctx.tenantId(), command);
    if (ctx.user().getRole() == AppUserRole.pharmacy_owner) {
      applyPriceList(account, normalized, clock.instant());
      account.setPriceListApprovalRequestId(null);
      account.setVersion(account.getVersion() + 1);
      account.setUpdatedAt(clock.instant());
      accountRepository.save(account);
      audit(ctx, "HOSPITAL_PRICE_LIST_UPDATE", account.getId());
      HospitalPriceListView view = buildPriceListView(ctx.tenantId(), account);
      return new HospitalPriceListUpdateResult("APPLIED", view, null);
    }
    if (!accessQueryService.hasAssignedRoleCode(ctx.user(), FinanceAccessPolicy.ACCOUNTANT_CODE)) {
      throw FinanceAccessPolicy.forbidden();
    }
    Optional<ApprovalRule> rule =
        approvalService.resolveApplicableRule(
            ctx.tenantId(), ModuleCode.HOSPITAL, ApprovalActionKey.HOSPITAL_PRICE_LIST);
    if (rule.isEmpty()) {
      throw new ApiException(
          HttpStatus.FORBIDDEN,
          HospitalPolicy.APPROVAL_REQUIRED,
          "Hospital price-list changes need the owner or a configured sign-off rule.");
    }
    String context = toContextJson(normalized);
    var request =
        approvalService.createRequest(
            principal,
            new CreateApprovalRequestCommand(
                ModuleCode.HOSPITAL,
                ApprovalActionKey.HOSPITAL_PRICE_LIST,
                principal.activeBranchId(),
                command.uniformDiscountBps(),
                context,
                "hospital-price:" + account.getId() + ":" + (account.getVersion() + 1)));
    account.setPriceListApprovalRequestId(request.id());
    account.setVersion(account.getVersion() + 1);
    account.setUpdatedAt(clock.instant());
    accountRepository.save(account);
    audit(ctx, "HOSPITAL_PRICE_LIST_REQUEST", account.getId());
    HospitalPriceListView view = buildPriceListView(ctx.tenantId(), account);
    return new HospitalPriceListUpdateResult("PENDING_APPROVAL", view, request.id());
  }

  @Transactional
  public void applyApprovedPriceList(UUID tenantId, UUID requestId, String contextJson) {
    HospitalCreditAccount account =
        accountRepository.lockByTenantId(tenantId).orElseThrow(HospitalService::notFound);
    NormalizedPriceList normalized = parseContextJson(contextJson);
    applyPriceList(account, normalized, clock.instant());
    if (Objects.equals(account.getPriceListApprovalRequestId(), requestId)) {
      account.setPriceListApprovalRequestId(null);
    }
    account.setVersion(account.getVersion() + 1);
    account.setUpdatedAt(clock.instant());
    accountRepository.save(account);
  }

  @Transactional
  public void clearPendingApproval(UUID tenantId, UUID requestId) {
    accountRepository
        .findByPriceListApprovalRequestIdAndTenantId(requestId, tenantId)
        .ifPresent(
            account -> {
              if (Objects.equals(account.getPriceListApprovalRequestId(), requestId)) {
                account.setPriceListApprovalRequestId(null);
                account.setVersion(account.getVersion() + 1);
                account.setUpdatedAt(clock.instant());
                accountRepository.save(account);
              }
            });
  }

  private void applyPriceList(
      HospitalCreditAccount account, NormalizedPriceList normalized, Instant now) {
    account.setUniformDiscountBps(normalized.uniformDiscountBps());
    List<HospitalProductPriceRule> existing =
        priceRuleRepository.findByTenantIdOrderByProductIdAsc(account.getTenantId());
    Map<UUID, HospitalProductPriceRule> byProduct =
        existing.stream()
            .collect(Collectors.toMap(HospitalProductPriceRule::getProductId, row -> row));
    Set<UUID> keep = normalized.productRules().keySet();
    for (HospitalProductPriceRule row : existing) {
      if (!keep.contains(row.getProductId())) {
        priceRuleRepository.delete(row);
      }
    }
    for (Map.Entry<UUID, RuleValue> entry : normalized.productRules().entrySet()) {
      HospitalProductPriceRule row = byProduct.get(entry.getKey());
      RuleValue value = entry.getValue();
      if (row == null) {
        row = new HospitalProductPriceRule();
        row.setId(UUID.randomUUID());
        row.setTenantId(account.getTenantId());
        row.setProductId(entry.getKey());
        row.setVersion(1);
        row.setCreatedAt(now);
      } else {
        row.setVersion(row.getVersion() + 1);
      }
      row.setRuleType(value.ruleType());
      row.setValue(value.value());
      row.setUpdatedAt(now);
      priceRuleRepository.save(row);
    }
  }

  private HospitalPriceListView buildPriceListView(UUID tenantId, HospitalCreditAccount account) {
    List<Product> products = productRepository.findAllByTenantIdOrderByNameAsc(tenantId);
    Map<UUID, HospitalProductPriceRule> rules =
        priceRuleRepository.findByTenantIdOrderByProductIdAsc(tenantId).stream()
            .collect(Collectors.toMap(HospitalProductPriceRule::getProductId, row -> row));
    List<HospitalProductPriceView> items = new ArrayList<>();
    for (Product product : products) {
      Long mrp = product.getDefaultMrpPaise();
      if (mrp == null || mrp <= 0L) {
        continue;
      }
      HospitalProductPriceRule rule = rules.get(product.getId());
      HospitalPriceRuleType ruleType = rule == null ? null : rule.getRuleType();
      Integer ruleValue = rule == null ? null : rule.getValue();
      long credit =
          HospitalPolicy.creditPricePaise(
              mrp, account.getUniformDiscountBps(), ruleType, ruleValue);
      items.add(
          new HospitalProductPriceView(
              product.getId(),
              product.getName(),
              product.getSku(),
              mrp,
              credit,
              HospitalPolicy.effectiveDiscountBps(mrp, credit),
              ruleType,
              ruleValue));
    }
    return new HospitalPriceListView(
        account.getUniformDiscountBps(), account.getPriceListApprovalRequestId(), items);
  }

  private NormalizedPriceList normalizePriceList(UUID tenantId, HospitalPriceListCommand command) {
    Map<UUID, RuleValue> productRules = new LinkedHashMap<>();
    if (command.productRules() != null) {
      for (HospitalPriceRuleCommand rule : command.productRules()) {
        if (rule == null || rule.productId() == null) {
          throw validationError();
        }
        Product product =
            productRepository
                .findByIdAndTenantId(rule.productId(), tenantId)
                .orElseThrow(HospitalService::notFound);
        Long mrp = product.getDefaultMrpPaise();
        if (mrp == null || mrp <= 0L) {
          throw validationError();
        }
        HospitalPriceRuleType type = HospitalPolicy.parseRuleType(rule.ruleType());
        int value = rule.value() == null ? 0 : rule.value();
        if (value < 0) {
          throw validationError();
        }
        if (type == HospitalPriceRuleType.PERCENT && value > 10_000) {
          throw validationError();
        }
        HospitalPolicy.creditPricePaise(mrp, command.uniformDiscountBps(), type, value);
        productRules.put(product.getId(), new RuleValue(type, value));
      }
    }
    return new NormalizedPriceList(command.uniformDiscountBps(), productRules);
  }

  private String toContextJson(NormalizedPriceList normalized) {
    Map<String, Object> payload = new HashMap<>();
    payload.put("uniformDiscountBps", normalized.uniformDiscountBps());
    List<Map<String, Object>> rules = new ArrayList<>();
    normalized
        .productRules()
        .forEach(
            (productId, value) -> {
              Map<String, Object> row = new HashMap<>();
              row.put("productId", productId.toString());
              row.put("ruleType", value.ruleType().name());
              row.put("value", value.value());
              rules.add(row);
            });
    payload.put("productRules", rules);
    try {
      return objectMapper.writeValueAsString(payload);
    } catch (JsonProcessingException ex) {
      throw validationError();
    }
  }

  @SuppressWarnings("unchecked")
  private NormalizedPriceList parseContextJson(String contextJson) {
    if (contextJson == null || contextJson.isBlank()) {
      throw validationError();
    }
    try {
      Map<String, Object> payload = objectMapper.readValue(contextJson, Map.class);
      int uniform =
          payload.get("uniformDiscountBps") instanceof Number number ? number.intValue() : 0;
      HospitalPolicy.requireUniformBps(uniform);
      Map<UUID, RuleValue> productRules = new LinkedHashMap<>();
      Object rawRules = payload.get("productRules");
      if (rawRules instanceof List<?> list) {
        for (Object item : list) {
          if (!(item instanceof Map<?, ?> row)) {
            continue;
          }
          UUID productId = UUID.fromString(String.valueOf(row.get("productId")));
          HospitalPriceRuleType type =
              HospitalPolicy.parseRuleType(String.valueOf(row.get("ruleType")));
          int value = row.get("value") instanceof Number number ? number.intValue() : 0;
          productRules.put(productId, new RuleValue(type, value));
        }
      }
      return new NormalizedPriceList(uniform, productRules);
    } catch (JsonProcessingException | RuntimeException ex) {
      throw validationError();
    }
  }

  private HospitalAccountView toAccountView(HospitalCreditAccount account) {
    long available = Math.max(0L, account.getCreditLimitPaise() - account.getBalancePaise());
    return new HospitalAccountView(
        true,
        account.getId(),
        account.getInstitutionName(),
        account.getGstin(),
        account.getStoresContact(),
        account.getBillingPhone(),
        account.getBillingEmail(),
        account.getCreditTerms(),
        account.getCreditLimitPaise(),
        account.getBalancePaise(),
        available,
        account.getUniformDiscountBps(),
        account.getPriceListApprovalRequestId(),
        account.getVersion());
  }

  private static HospitalAccountView emptyAccountView() {
    return new HospitalAccountView(
        false, null, null, null, null, null, null, null, 0L, 0L, 0L, 0, null, 0L);
  }

  private Context requireRead(AuthPrincipal principal) {
    AppUser user = requireTenantUser(principal);
    PlanCode plan = subscriptionService.resolvePlan(user.getTenantId());
    HospitalPolicy.assertEntitled(plan);
    Set<ModuleCode> modules = accessQueryService.effectiveModules(user);
    HospitalPolicy.requireHospitalModule(modules.contains(ModuleCode.HOSPITAL));
    return new Context(user, user.getTenantId());
  }

  private Context requireAccountWriter(AuthPrincipal principal) {
    AppUser user = requireTenantUser(principal);
    PlanCode plan = subscriptionService.resolvePlan(user.getTenantId());
    HospitalPolicy.assertEntitled(plan);
    boolean hasHospital = accessQueryService.effectiveModules(user).contains(ModuleCode.HOSPITAL);
    boolean accountant =
        accessQueryService.hasAssignedRoleCode(user, FinanceAccessPolicy.ACCOUNTANT_CODE);
    HospitalPolicy.requireAccountWriter(user.getRole(), accountant, hasHospital);
    return new Context(user, user.getTenantId());
  }

  private AppUser requireTenantUser(AuthPrincipal principal) {
    if (principal == null || principal.tenantId() == null) {
      throw new ApiException(HttpStatus.UNAUTHORIZED, "UNAUTHENTICATED", "Unauthenticated");
    }
    return appUserRepository
        .findById(principal.userId())
        .filter(user -> user.getTenantId() != null)
        .orElseThrow(
            () -> new ApiException(HttpStatus.UNAUTHORIZED, "UNAUTHENTICATED", "Unauthenticated"));
  }

  private void audit(Context ctx, String action, UUID accountId) {
    auditService.record(
        new AuditRecordCommand(
            ctx.user().getId(),
            ctx.tenantId(),
            null,
            action,
            AuditService.OUTCOME_SUCCESS,
            null,
            null,
            null,
            null,
            "{\"accountId\":\"" + accountId + "\"}"));
  }

  private static String trimOrNull(String value) {
    if (value == null) {
      return null;
    }
    String trimmed = value.trim();
    return trimmed.isEmpty() ? null : trimmed;
  }

  private static ApiException validationError() {
    return new ApiException(HttpStatus.BAD_REQUEST, "VALIDATION_ERROR", "Invalid request");
  }

  private static ApiException staleState() {
    return new ApiException(
        HttpStatus.CONFLICT, "STALE_STATE", "Hospital account was updated by someone else.");
  }

  private static ApiException notFound() {
    return HospitalPolicy.notFound();
  }

  private record Context(AppUser user, UUID tenantId) {}

  record NormalizedPriceList(int uniformDiscountBps, Map<UUID, RuleValue> productRules) {}

  record RuleValue(HospitalPriceRuleType ruleType, int value) {}
}
