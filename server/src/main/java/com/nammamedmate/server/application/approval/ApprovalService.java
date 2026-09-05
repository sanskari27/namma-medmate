package com.nammamedmate.server.application.approval;

import com.nammamedmate.server.application.access.AccessQueryService;
import com.nammamedmate.server.application.audit.AuditRecordCommand;
import com.nammamedmate.server.application.audit.AuditService;
import com.nammamedmate.server.application.notification.NotificationRoutingService;
import com.nammamedmate.server.application.notification.RouteCommand;
import com.nammamedmate.server.domain.AccessRole;
import com.nammamedmate.server.domain.AccessScope;
import com.nammamedmate.server.domain.AppUser;
import com.nammamedmate.server.domain.AppUserRole;
import com.nammamedmate.server.domain.ApprovalDecision;
import com.nammamedmate.server.domain.ApprovalDecisionOutcome;
import com.nammamedmate.server.domain.ApprovalPolicy;
import com.nammamedmate.server.domain.ApprovalRequest;
import com.nammamedmate.server.domain.ApprovalRequestStatus;
import com.nammamedmate.server.domain.ApprovalRule;
import com.nammamedmate.server.domain.ApproverType;
import com.nammamedmate.server.domain.ModuleCode;
import com.nammamedmate.server.domain.NotificationTrigger;
import com.nammamedmate.server.domain.RoutingRole;
import com.nammamedmate.server.infrastructure.security.AuthPrincipal;
import com.nammamedmate.server.persistence.AccessRoleRepository;
import com.nammamedmate.server.persistence.AppUserRepository;
import com.nammamedmate.server.persistence.ApprovalDecisionRepository;
import com.nammamedmate.server.persistence.ApprovalRequestRepository;
import com.nammamedmate.server.persistence.ApprovalRuleRepository;
import com.nammamedmate.server.persistence.LocationRepository;
import com.nammamedmate.server.persistence.UserAccessRoleRepository;
import com.nammamedmate.server.shared.exception.ApiException;
import java.time.Clock;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Optional;
import java.util.UUID;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ApprovalService {

  private final ApprovalRuleRepository approvalRuleRepository;
  private final ApprovalRequestRepository approvalRequestRepository;
  private final ApprovalDecisionRepository approvalDecisionRepository;
  private final AccessRoleRepository accessRoleRepository;
  private final AppUserRepository appUserRepository;
  private final UserAccessRoleRepository userAccessRoleRepository;
  private final LocationRepository locationRepository;
  private final AccessQueryService accessQueryService;
  private final NotificationRoutingService notificationRoutingService;
  private final AuditService auditService;
  private final Clock clock;
  private final List<ApprovalDecisionListener> decisionListeners;

  public ApprovalService(
      ApprovalRuleRepository approvalRuleRepository,
      ApprovalRequestRepository approvalRequestRepository,
      ApprovalDecisionRepository approvalDecisionRepository,
      AccessRoleRepository accessRoleRepository,
      AppUserRepository appUserRepository,
      UserAccessRoleRepository userAccessRoleRepository,
      LocationRepository locationRepository,
      AccessQueryService accessQueryService,
      NotificationRoutingService notificationRoutingService,
      AuditService auditService,
      Clock clock,
      List<ApprovalDecisionListener> decisionListeners) {
    this.approvalRuleRepository = approvalRuleRepository;
    this.approvalRequestRepository = approvalRequestRepository;
    this.approvalDecisionRepository = approvalDecisionRepository;
    this.accessRoleRepository = accessRoleRepository;
    this.appUserRepository = appUserRepository;
    this.userAccessRoleRepository = userAccessRoleRepository;
    this.locationRepository = locationRepository;
    this.accessQueryService = accessQueryService;
    this.notificationRoutingService = notificationRoutingService;
    this.auditService = auditService;
    this.clock = clock;
    this.decisionListeners = decisionListeners == null ? List.of() : List.copyOf(decisionListeners);
  }

  @Transactional(readOnly = true)
  public List<ApprovalActionCatalog.ApprovalActionCatalogItem> actions() {
    return ApprovalActionCatalog.all();
  }

  @Transactional(readOnly = true)
  public List<ApprovalRuleView> listRules(AuthPrincipal principal) {
    Actor actor = actor(principal);
    requireApprovals(actor);
    List<ApprovalRule> rules =
        actor.scope() == AccessScope.PLATFORM
            ? approvalRuleRepository.findByScopeAndDeletedAtIsNullOrderByModuleCodeAscActionKeyAsc(
                AccessScope.PLATFORM)
            : approvalRuleRepository
                .findByTenantIdAndDeletedAtIsNullOrderByModuleCodeAscActionKeyAsc(actor.tenantId());
    return rules.stream().map(ApprovalService::toRuleView).toList();
  }

  @Transactional
  public ApprovalRuleView createRule(AuthPrincipal principal, CreateApprovalRuleCommand command) {
    Actor actor = actor(principal);
    requireApprovals(actor);
    validateRuleCommand(command);
    Instant now = Instant.now(clock);
    ApprovalRule rule = new ApprovalRule();
    rule.setId(UUID.randomUUID());
    rule.setTenantId(actor.scope() == AccessScope.TENANT ? actor.tenantId() : null);
    rule.setScope(actor.scope());
    rule.setModuleCode(command.moduleCode());
    rule.setActionKey(command.actionKey());
    rule.setThresholdValue(command.thresholdValue());
    rule.setApproverType(command.approverType());
    rule.setApproverAccountClass(command.approverAccountClass());
    rule.setApproverRoleId(command.approverRoleId());
    rule.setAllowSelfApproval(command.allowSelfApproval());
    rule.setVersion(1);
    rule.setCreatedBy(actor.userId());
    rule.setCreatedAt(now);
    rule.setUpdatedAt(now);
    try {
      approvalRuleRepository.saveAndFlush(rule);
    } catch (DataIntegrityViolationException ex) {
      throw new ApiException(
          HttpStatus.CONFLICT, "DUPLICATE_RULE", "A rule already exists for this action");
    }
    audit(
        actor,
        "APPROVAL_RULE_CREATE",
        AuditService.OUTCOME_SUCCESS,
        "{\"ruleId\":\"" + rule.getId() + "\"}");
    return toRuleView(rule);
  }

  @Transactional
  public ApprovalRuleView patchRule(
      AuthPrincipal principal,
      UUID ruleId,
      Integer thresholdValue,
      ApproverType approverType,
      AppUserRole approverAccountClass,
      UUID approverRoleId,
      Boolean allowSelfApproval,
      Integer version) {
    Actor actor = actor(principal);
    requireApprovals(actor);
    ApprovalRule rule = requireRule(actor, ruleId);
    if (version == null || version != rule.getVersion()) {
      throw new ApiException(
          HttpStatus.CONFLICT, "STALE_STATE", "Approval rule was updated by someone else");
    }
    CreateApprovalRuleCommand shape =
        new CreateApprovalRuleCommand(
            rule.getModuleCode(),
            rule.getActionKey(),
            thresholdValue != null ? thresholdValue : rule.getThresholdValue(),
            approverType != null ? approverType : rule.getApproverType(),
            approverAccountClass != null ? approverAccountClass : rule.getApproverAccountClass(),
            approverRoleId != null ? approverRoleId : rule.getApproverRoleId(),
            allowSelfApproval != null ? allowSelfApproval : rule.isAllowSelfApproval());
    validateRuleCommand(shape);
    rule.setThresholdValue(shape.thresholdValue());
    rule.setApproverType(shape.approverType());
    rule.setApproverAccountClass(shape.approverAccountClass());
    rule.setApproverRoleId(shape.approverRoleId());
    rule.setAllowSelfApproval(shape.allowSelfApproval());
    rule.setVersion(rule.getVersion() + 1);
    rule.setUpdatedAt(Instant.now(clock));
    approvalRuleRepository.save(rule);
    audit(
        actor,
        "APPROVAL_RULE_UPDATE",
        AuditService.OUTCOME_SUCCESS,
        "{\"ruleId\":\"" + rule.getId() + "\"}");
    return toRuleView(rule);
  }

  @Transactional
  public ApprovalRuleView deactivateRule(AuthPrincipal principal, UUID ruleId) {
    Actor actor = actor(principal);
    requireApprovals(actor);
    ApprovalRule rule = requireRule(actor, ruleId);
    rule.setDeletedAt(Instant.now(clock));
    rule.setUpdatedAt(rule.getDeletedAt());
    rule.setVersion(rule.getVersion() + 1);
    approvalRuleRepository.save(rule);
    audit(
        actor,
        "APPROVAL_RULE_DEACTIVATE",
        AuditService.OUTCOME_SUCCESS,
        "{\"ruleId\":\"" + rule.getId() + "\"}");
    return toRuleView(rule);
  }

  @Transactional
  public ApprovalRequestView createRequest(
      AuthPrincipal principal, CreateApprovalRequestCommand command) {
    Actor actor = actor(principal);
    if (command == null || command.moduleCode() == null || command.actionKey() == null) {
      throw new ApiException(HttpStatus.BAD_REQUEST, "VALIDATION_ERROR", "Invalid request");
    }
    ApprovalPolicy.rejectFinanceExpenseRouting(command.moduleCode());
    ApprovalActionCatalog.requireModuleMatch(command.actionKey(), command.moduleCode());
    if (command.idempotencyKey() != null && !command.idempotencyKey().isBlank()) {
      Optional<ApprovalRequest> existing =
          approvalRequestRepository.findByTenantIdAndIdempotencyKey(
              actor.tenantId(), command.idempotencyKey().trim());
      if (existing.isPresent()) {
        return toRequestView(existing.get());
      }
    }
    if (actor.tenantId() == null) {
      throw new ApiException(
          HttpStatus.UNPROCESSABLE_ENTITY,
          "TENANT_REQUIRED",
          "Approval requests require a tenant context");
    }
    ApprovalRule rule =
        approvalRuleRepository
            .findByTenantIdAndModuleCodeAndActionKeyAndDeletedAtIsNull(
                actor.tenantId(), command.moduleCode(), command.actionKey())
            .orElseThrow(
                () ->
                    new ApiException(
                        HttpStatus.UNPROCESSABLE_ENTITY,
                        "RULE_MISSING",
                        "No approval rule configured for this action"));
    if (command.branchId() != null
        && locationRepository
            .findByIdAndTenantIdAndDeletedAtIsNull(command.branchId(), actor.tenantId())
            .isEmpty()) {
      throw new ApiException(
          HttpStatus.UNPROCESSABLE_ENTITY, "BRANCH_NOT_IN_TENANT", "Branch is not in this tenant");
    }
    String context = AuditService.sanitizeContext(command.contextJson());
    Instant now = Instant.now(clock);
    ApprovalRequest request = new ApprovalRequest();
    request.setId(UUID.randomUUID());
    request.setTenantId(actor.tenantId());
    request.setBranchId(command.branchId());
    request.setRuleId(rule.getId());
    request.setRequesterUserId(actor.userId());
    request.setModuleCode(command.moduleCode());
    request.setActionKey(command.actionKey());
    request.setAmountValue(command.amountValue());
    request.setThresholdSnapshot(rule.getThresholdValue());
    request.setRuleVersionSnapshot(rule.getVersion());
    request.setContextJson(context);
    request.setStatus(ApprovalRequestStatus.PENDING);
    request.setIdempotencyKey(
        command.idempotencyKey() == null || command.idempotencyKey().isBlank()
            ? null
            : command.idempotencyKey().trim());
    request.setVersion(1);
    request.setCreatedAt(now);
    request.setUpdatedAt(now);
    try {
      approvalRequestRepository.saveAndFlush(request);
    } catch (DataIntegrityViolationException ex) {
      return approvalRequestRepository
          .findByTenantIdAndIdempotencyKey(actor.tenantId(), request.getIdempotencyKey())
          .map(ApprovalService::toRequestView)
          .orElseThrow(() -> ex);
    }
    notificationRoutingService.route(
        new RouteCommand(
            "approval:" + request.getId(),
            NotificationTrigger.APPROVAL_REQUESTED,
            request.getTenantId(),
            request.getBranchId(),
            request.getId(),
            null,
            toRoutingRole(rule),
            null));
    audit(
        actor,
        "APPROVAL_REQUEST_CREATE",
        AuditService.OUTCOME_SUCCESS,
        "{\"requestId\":\"" + request.getId() + "\"}");
    return toRequestView(request);
  }

  @Transactional(readOnly = true)
  public List<ApprovalRequestView> pending(AuthPrincipal principal) {
    Actor actor = actor(principal);
    List<ApprovalRequest> pending =
        actor.scope() == AccessScope.PLATFORM
            ? approvalRequestRepository.findByStatusOrderByCreatedAtAsc(
                ApprovalRequestStatus.PENDING)
            : approvalRequestRepository.findByTenantIdAndStatusOrderByCreatedAtAsc(
                actor.tenantId(), ApprovalRequestStatus.PENDING);
    List<ApprovalRequestView> views = new ArrayList<>();
    for (ApprovalRequest request : pending) {
      ApprovalRule rule =
          approvalRuleRepository.findByIdAndDeletedAtIsNull(request.getRuleId()).orElse(null);
      if (rule == null) {
        continue;
      }
      if (canApprove(actor, rule, request)) {
        views.add(toRequestView(request));
      }
    }
    return views;
  }

  @Transactional
  public ApprovalRequestView decide(
      AuthPrincipal principal, UUID requestId, DecideApprovalCommand command) {
    Actor actor = actor(principal);
    if (command == null || command.outcome() == null) {
      throw new ApiException(HttpStatus.BAD_REQUEST, "VALIDATION_ERROR", "Invalid request");
    }
    ApprovalRequest request =
        (actor.scope() == AccessScope.PLATFORM
                ? approvalRequestRepository.findById(requestId)
                : approvalRequestRepository.findByIdAndTenantId(requestId, actor.tenantId()))
            .orElseThrow(ApprovalService::notFound);
    if (request.getStatus() != ApprovalRequestStatus.PENDING) {
      throw new ApiException(
          HttpStatus.CONFLICT, "STALE_STATE", "Approval request is no longer pending");
    }
    ApprovalPolicy.requirePendingVersion(command.requestVersion(), request.getVersion());
    ApprovalRule rule =
        approvalRuleRepository
            .findByIdAndDeletedAtIsNull(request.getRuleId())
            .orElseThrow(ApprovalService::notFound);
    if (!canApprove(actor, rule, request)) {
      throw new ApiException(HttpStatus.FORBIDDEN, "FORBIDDEN", "Not an approver for this request");
    }
    ApprovalPolicy.rejectSelfApprovalIfProhibited(
        rule.isAllowSelfApproval(), request.getRequesterUserId(), actor.userId());
    ApprovalPolicy.requireMatchingRuleSnapshot(
        request.getRuleVersionSnapshot(),
        request.getThresholdSnapshot(),
        rule.getVersion(),
        rule.getThresholdValue());
    Instant now = Instant.now(clock);
    ApprovalDecision decision = new ApprovalDecision();
    decision.setId(UUID.randomUUID());
    decision.setRequestId(request.getId());
    decision.setActorUserId(actor.userId());
    decision.setOutcome(command.outcome());
    decision.setNote(trimNote(command.note()));
    decision.setRuleVersionSnapshot(rule.getVersion());
    decision.setThresholdSnapshot(rule.getThresholdValue());
    decision.setDecidedAt(now);
    approvalDecisionRepository.save(decision);
    request.setStatus(
        command.outcome() == ApprovalDecisionOutcome.APPROVED
            ? ApprovalRequestStatus.APPROVED
            : ApprovalRequestStatus.REJECTED);
    request.setVersion(request.getVersion() + 1);
    request.setUpdatedAt(now);
    approvalRequestRepository.save(request);
    audit(
        actor,
        "APPROVAL_DECISION",
        command.outcome().name(),
        "{\"requestId\":\"" + request.getId() + "\",\"actorUserId\":\"" + actor.userId() + "\"}");
    for (ApprovalDecisionListener listener : decisionListeners) {
      listener.onDecided(request.getId(), command.outcome(), actor.userId(), now);
    }
    return new ApprovalRequestView(
        request.getId(),
        request.getTenantId(),
        request.getBranchId(),
        request.getRuleId(),
        request.getRequesterUserId(),
        request.getModuleCode(),
        request.getActionKey(),
        request.getAmountValue(),
        request.getThresholdSnapshot(),
        request.getRuleVersionSnapshot(),
        request.getContextJson(),
        request.getStatus(),
        request.getVersion(),
        request.getCreatedAt(),
        decision.getOutcome(),
        decision.getActorUserId());
  }

  private void validateRuleCommand(CreateApprovalRuleCommand command) {
    if (command == null || command.moduleCode() == null || command.actionKey() == null) {
      throw new ApiException(HttpStatus.BAD_REQUEST, "VALIDATION_ERROR", "Invalid request");
    }
    ApprovalPolicy.rejectFinanceExpenseRouting(command.moduleCode());
    ApprovalActionCatalog.requireModuleMatch(command.actionKey(), command.moduleCode());
    if (command.approverType() == null) {
      throw new ApiException(HttpStatus.BAD_REQUEST, "VALIDATION_ERROR", "Invalid request");
    }
    if (command.approverType() == ApproverType.ACCOUNT_CLASS) {
      if (command.approverAccountClass() == null
          || (command.approverAccountClass() != AppUserRole.pharmacy_owner
              && command.approverAccountClass() != AppUserRole.admin_super)
          || command.approverRoleId() != null) {
        throw new ApiException(HttpStatus.BAD_REQUEST, "VALIDATION_ERROR", "Invalid request");
      }
    } else {
      if (command.approverRoleId() == null || command.approverAccountClass() != null) {
        throw new ApiException(HttpStatus.BAD_REQUEST, "VALIDATION_ERROR", "Invalid request");
      }
      AccessRole role =
          accessRoleRepository
              .findById(command.approverRoleId())
              .filter(candidate -> candidate.getDeletedAt() == null)
              .orElseThrow(
                  () ->
                      new ApiException(
                          HttpStatus.UNPROCESSABLE_ENTITY,
                          "ROLE_NOT_FOUND",
                          "Approver role was not found"));
      if (role.getScope() != AccessScope.TENANT && role.getScope() != AccessScope.PLATFORM) {
        throw new ApiException(
            HttpStatus.UNPROCESSABLE_ENTITY, "ROLE_NOT_FOUND", "Approver role was not found");
      }
    }
  }

  private ApprovalRule requireRule(Actor actor, UUID ruleId) {
    ApprovalRule rule =
        approvalRuleRepository
            .findByIdAndDeletedAtIsNull(ruleId)
            .orElseThrow(ApprovalService::notFound);
    if (actor.scope() == AccessScope.TENANT) {
      if (rule.getScope() != AccessScope.TENANT
          || rule.getTenantId() == null
          || !rule.getTenantId().equals(actor.tenantId())) {
        throw notFound();
      }
    } else if (rule.getScope() != AccessScope.PLATFORM) {
      throw notFound();
    }
    return rule;
  }

  private boolean canApprove(Actor actor, ApprovalRule rule, ApprovalRequest request) {
    if (actor.scope() == AccessScope.TENANT
        && (request.getTenantId() == null || !request.getTenantId().equals(actor.tenantId()))) {
      return false;
    }
    if (rule.getApproverType() == ApproverType.ACCOUNT_CLASS) {
      return actor.role() == rule.getApproverAccountClass();
    }
    return userAccessRoleRepository
        .findByUserIdAndRoleId(actor.userId(), rule.getApproverRoleId())
        .isPresent();
  }

  private RoutingRole toRoutingRole(ApprovalRule rule) {
    if (rule.getApproverType() == ApproverType.ACCOUNT_CLASS) {
      if (rule.getApproverAccountClass() == AppUserRole.admin_super) {
        return RoutingRole.MASTER;
      }
      return RoutingRole.OWNER;
    }
    AccessRole role = accessRoleRepository.findById(rule.getApproverRoleId()).orElse(null);
    if (role == null || role.getCode() == null) {
      return RoutingRole.APPROVER;
    }
    return switch (role.getCode().toLowerCase(Locale.ROOT)) {
      case "pharmacist" -> RoutingRole.PHARMACIST;
      case "inventory" -> RoutingRole.INVENTORY;
      case "accountant" -> RoutingRole.ACCOUNTANT;
      default -> RoutingRole.APPROVER;
    };
  }

  private void requireApprovals(Actor actor) {
    if (actor.role() == AppUserRole.admin_super) {
      return;
    }
    ApprovalPolicy.requireApprovalsModule(
        accessQueryService.effectiveModules(actor.user()).contains(ModuleCode.APPROVALS));
  }

  private Actor actor(AuthPrincipal principal) {
    AppUser user =
        appUserRepository
            .findById(principal.userId())
            .filter(candidate -> candidate.getDeletedAt() == null)
            .orElseThrow(
                () ->
                    new ApiException(
                        HttpStatus.UNAUTHORIZED, "UNAUTHORIZED", "Authentication required"));
    AccessScope scope =
        user.getRole() == AppUserRole.admin_super
                || user.getRole() == AppUserRole.admin_verification
            ? AccessScope.PLATFORM
            : AccessScope.TENANT;
    return new Actor(user.getId(), user.getTenantId(), user.getRole(), scope, user);
  }

  private void audit(Actor actor, String action, String outcome, String contextJson) {
    auditService.record(
        new AuditRecordCommand(
            actor.userId(),
            actor.tenantId(),
            null,
            action,
            outcome,
            null,
            null,
            null,
            null,
            contextJson));
  }

  private static ApprovalRuleView toRuleView(ApprovalRule rule) {
    return new ApprovalRuleView(
        rule.getId(),
        rule.getTenantId(),
        rule.getScope(),
        rule.getModuleCode(),
        rule.getActionKey(),
        rule.getThresholdValue(),
        rule.getApproverType(),
        rule.getApproverAccountClass(),
        rule.getApproverRoleId(),
        rule.isAllowSelfApproval(),
        rule.getVersion());
  }

  private static ApprovalRequestView toRequestView(ApprovalRequest request) {
    return new ApprovalRequestView(
        request.getId(),
        request.getTenantId(),
        request.getBranchId(),
        request.getRuleId(),
        request.getRequesterUserId(),
        request.getModuleCode(),
        request.getActionKey(),
        request.getAmountValue(),
        request.getThresholdSnapshot(),
        request.getRuleVersionSnapshot(),
        request.getContextJson(),
        request.getStatus(),
        request.getVersion(),
        request.getCreatedAt(),
        null,
        null);
  }

  private static String trimNote(String note) {
    if (note == null || note.isBlank()) {
      return null;
    }
    String trimmed = note.trim();
    return trimmed.length() <= 500 ? trimmed : trimmed.substring(0, 500);
  }

  private static ApiException notFound() {
    return new ApiException(HttpStatus.NOT_FOUND, "NOT_FOUND", "Approval was not found");
  }

  private record Actor(
      UUID userId, UUID tenantId, AppUserRole role, AccessScope scope, AppUser user) {}
}
