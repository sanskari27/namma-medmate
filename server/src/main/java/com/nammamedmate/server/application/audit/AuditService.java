package com.nammamedmate.server.application.audit;

import com.nammamedmate.server.application.access.AccessQueryService;
import com.nammamedmate.server.domain.AppUser;
import com.nammamedmate.server.domain.AppUserRole;
import com.nammamedmate.server.domain.ApprovalPolicy;
import com.nammamedmate.server.domain.AuditEvent;
import com.nammamedmate.server.domain.ModuleCode;
import com.nammamedmate.server.infrastructure.security.AuthPrincipal;
import com.nammamedmate.server.persistence.AppUserRepository;
import com.nammamedmate.server.persistence.AuditEventRepository;
import com.nammamedmate.server.shared.exception.ApiException;
import java.time.Clock;
import java.time.Instant;
import java.util.List;
import java.util.Locale;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AuditService {

  public static final String LOGIN_ACTION = "LOGIN";
  public static final String PIN_LOGIN_ACTION = "PIN_LOGIN";
  public static final String OUTCOME_SUCCESS = "SUCCESS";
  public static final String OUTCOME_FAILURE = "FAILURE";

  private final AuditEventRepository auditEventRepository;
  private final AppUserRepository appUserRepository;
  private final AccessQueryService accessQueryService;
  private final Clock clock;

  public AuditService(
      AuditEventRepository auditEventRepository,
      AppUserRepository appUserRepository,
      AccessQueryService accessQueryService,
      Clock clock) {
    this.auditEventRepository = auditEventRepository;
    this.appUserRepository = appUserRepository;
    this.accessQueryService = accessQueryService;
    this.clock = clock;
  }

  @Transactional(propagation = Propagation.REQUIRES_NEW)
  public void record(AuditRecordCommand command) {
    if (command == null || command.action() == null || command.action().isBlank()) {
      return;
    }
    String context = sanitizeContext(command.contextJson());
    AuditEvent event = new AuditEvent();
    event.setId(UUID.randomUUID());
    event.setUserId(command.userId());
    event.setTenantId(command.tenantId());
    event.setBranchId(command.branchId());
    event.setAction(command.action());
    event.setOutcome(command.outcome() == null ? OUTCOME_SUCCESS : command.outcome());
    event.setAttemptedIdentity(trim(command.attemptedIdentity(), 320));
    event.setSourceIp(trim(command.sourceIp(), 64));
    event.setUserAgent(trim(command.userAgent(), 512));
    event.setSessionId(command.sessionId());
    event.setContextJson(context);
    event.setCreatedAt(Instant.now(clock));
    auditEventRepository.save(event);
  }

  @Transactional(readOnly = true)
  public List<AuditEventView> list(AuthPrincipal principal) {
    AppUser actor = requireActor(principal);
    requireApprovals(actor);
    Instant cutoff = ApprovalPolicy.retentionCutoff(Instant.now(clock));
    List<AuditEvent> events;
    if (actor.getRole() == AppUserRole.admin_super) {
      events = auditEventRepository.findByCreatedAtGreaterThanEqualOrderByCreatedAtDesc(cutoff);
    } else {
      events =
          auditEventRepository.findByTenantIdAndCreatedAtGreaterThanEqualOrderByCreatedAtDesc(
              actor.getTenantId(), cutoff);
    }
    return events.stream().map(AuditService::toView).toList();
  }

  @Transactional(readOnly = true)
  public List<AuditEventView> export(AuthPrincipal principal) {
    return list(principal);
  }

  @Transactional
  public int purgeExpired() {
    Instant cutoff = ApprovalPolicy.retentionCutoff(Instant.now(clock));
    auditEventRepository.deleteByCreatedAtBefore(cutoff);
    return 0;
  }

  private void requireApprovals(AppUser actor) {
    if (actor.getRole() == AppUserRole.admin_super) {
      return;
    }
    ApprovalPolicy.requireApprovalsModule(
        accessQueryService.effectiveModules(actor).contains(ModuleCode.APPROVALS));
  }

  private AppUser requireActor(AuthPrincipal principal) {
    return appUserRepository
        .findById(principal.userId())
        .filter(user -> user.getDeletedAt() == null)
        .orElseThrow(
            () ->
                new ApiException(
                    HttpStatus.UNAUTHORIZED, "UNAUTHORIZED", "Authentication required"));
  }

  private static AuditEventView toView(AuditEvent event) {
    return new AuditEventView(
        event.getId(),
        event.getUserId(),
        event.getTenantId(),
        event.getBranchId(),
        event.getAction(),
        event.getOutcome(),
        event.getAttemptedIdentity(),
        event.getSourceIp(),
        event.getUserAgent(),
        event.getSessionId(),
        event.getContextJson(),
        event.getCreatedAt());
  }

  public static String sanitizeContext(String contextJson) {
    if (contextJson == null || contextJson.isBlank()) {
      return null;
    }
    String lower = contextJson.toLowerCase(Locale.ROOT);
    if (lower.contains("password")
        || lower.contains("\"pin\"")
        || lower.contains("token")
        || lower.contains("secret")) {
      throw new ApiException(
          HttpStatus.BAD_REQUEST, "VALIDATION_ERROR", "Audit context must not contain secrets");
    }
    return contextJson;
  }

  private static String trim(String value, int max) {
    if (value == null || value.isBlank()) {
      return null;
    }
    String trimmed = value.trim();
    return trimmed.length() <= max ? trimmed : trimmed.substring(0, max);
  }
}
