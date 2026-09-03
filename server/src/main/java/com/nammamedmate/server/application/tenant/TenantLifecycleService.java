package com.nammamedmate.server.application.tenant;

import com.nammamedmate.server.application.audit.AuditRecordCommand;
import com.nammamedmate.server.application.audit.AuditService;
import com.nammamedmate.server.domain.AppUser;
import com.nammamedmate.server.domain.AppUserRole;
import com.nammamedmate.server.domain.Tenant;
import com.nammamedmate.server.domain.TenantStatus;
import com.nammamedmate.server.domain.TenantStatusTransition;
import com.nammamedmate.server.infrastructure.security.AuthPrincipal;
import com.nammamedmate.server.persistence.AppUserRepository;
import com.nammamedmate.server.persistence.TenantRepository;
import com.nammamedmate.server.shared.exception.ApiException;
import java.time.Clock;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class TenantLifecycleService {

  public static final String TENANT_STATUS_CHANGE_ACTION = "TENANT_STATUS_CHANGE";

  private final TenantRepository tenantRepository;
  private final AppUserRepository appUserRepository;
  private final AuditService auditService;
  private final Clock clock;

  public TenantLifecycleService(
      TenantRepository tenantRepository,
      AppUserRepository appUserRepository,
      AuditService auditService,
      Clock clock) {
    this.tenantRepository = tenantRepository;
    this.appUserRepository = appUserRepository;
    this.auditService = auditService;
    this.clock = clock;
  }

  @Transactional(readOnly = true)
  public List<TenantLifecycleView> list(AuthPrincipal principal) {
    requireMaster(principal);
    return tenantRepository.findAllByDeletedAtIsNullOrderByNameAsc().stream()
        .map(TenantLifecycleService::toView)
        .toList();
  }

  @Transactional
  public TenantLifecycleView updateStatus(
      AuthPrincipal principal,
      UUID tenantId,
      TenantStatus status,
      TenantStatus expectedStatus,
      String reason) {
    AppUser master = requireMaster(principal);
    if (status == null || expectedStatus == null) {
      throw new ApiException(HttpStatus.BAD_REQUEST, "VALIDATION_ERROR", "Invalid request");
    }
    String trimmedReason = reason == null ? "" : reason.trim();
    if (trimmedReason.isEmpty()) {
      throw new ApiException(HttpStatus.BAD_REQUEST, "VALIDATION_ERROR", "Invalid request");
    }

    Tenant tenant =
        tenantRepository
            .lockById(tenantId)
            .filter(candidate -> candidate.getDeletedAt() == null)
            .orElseThrow(
                () -> new ApiException(HttpStatus.NOT_FOUND, "NOT_FOUND", "Tenant not found"));

    if (tenant.getStatus() != expectedStatus) {
      throw new ApiException(
          HttpStatus.CONFLICT, "STALE_STATE", "Tenant status was updated by someone else");
    }
    if (!TenantStatusTransition.isAllowed(tenant.getStatus(), status)) {
      throw new ApiException(
          HttpStatus.UNPROCESSABLE_ENTITY,
          "INVALID_TRANSITION",
          "Tenant status transition is not allowed");
    }

    TenantStatus from = tenant.getStatus();
    Instant now = Instant.now(clock);
    tenant.setStatus(status);
    tenant.setUpdatedAt(now);
    tenantRepository.save(tenant);

    String contextJson =
        "{\"from\":\""
            + from.name()
            + "\",\"to\":\""
            + status.name()
            + "\",\"reason\":\""
            + escapeJson(trimmedReason)
            + "\"}";
    auditService.record(
        new AuditRecordCommand(
            master.getId(),
            tenant.getId(),
            null,
            TENANT_STATUS_CHANGE_ACTION,
            AuditService.OUTCOME_SUCCESS,
            null,
            null,
            null,
            null,
            contextJson));

    return toView(tenant);
  }

  private AppUser requireMaster(AuthPrincipal principal) {
    if (principal == null || principal.userId() == null) {
      throw new ApiException(HttpStatus.UNAUTHORIZED, "UNAUTHORIZED", "Authentication required");
    }
    AppUser actor =
        appUserRepository
            .findById(principal.userId())
            .filter(user -> user.getDeletedAt() == null)
            .orElseThrow(
                () ->
                    new ApiException(
                        HttpStatus.UNAUTHORIZED, "UNAUTHORIZED", "Authentication required"));
    if (actor.getRole() != AppUserRole.admin_super) {
      throw new ApiException(HttpStatus.FORBIDDEN, "FORBIDDEN", "Access denied");
    }
    return actor;
  }

  private static TenantLifecycleView toView(Tenant tenant) {
    return new TenantLifecycleView(
        tenant.getId(),
        tenant.getName(),
        tenant.getSlug(),
        tenant.getStatus(),
        tenant.getUpdatedAt(),
        TenantStatusTransition.allowedFrom(tenant.getStatus()).stream().sorted().toList());
  }

  private static String escapeJson(String value) {
    return value
        .replace("\\", "\\\\")
        .replace("\"", "\\\"")
        .replace("\n", "\\n")
        .replace("\r", "\\r")
        .replace("\t", "\\t");
  }
}
