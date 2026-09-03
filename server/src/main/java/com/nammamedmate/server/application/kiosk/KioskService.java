package com.nammamedmate.server.application.kiosk;

import com.nammamedmate.server.application.access.AccessQueryService;
import com.nammamedmate.server.application.branch.BranchAssignmentService;
import com.nammamedmate.server.application.subscription.SubscriptionService;
import com.nammamedmate.server.domain.AppUser;
import com.nammamedmate.server.domain.AppUserRole;
import com.nammamedmate.server.domain.BranchType;
import com.nammamedmate.server.domain.KioskSession;
import com.nammamedmate.server.domain.KioskSessionStatus;
import com.nammamedmate.server.domain.KioskTicket;
import com.nammamedmate.server.domain.KioskTicketStatus;
import com.nammamedmate.server.domain.Location;
import com.nammamedmate.server.domain.ModuleCode;
import com.nammamedmate.server.domain.PlanCode;
import com.nammamedmate.server.domain.PlanModuleEntitlements;
import com.nammamedmate.server.domain.UserAccountStatus;
import com.nammamedmate.server.infrastructure.security.AuthPrincipal;
import com.nammamedmate.server.persistence.AppUserRepository;
import com.nammamedmate.server.persistence.KioskSessionRepository;
import com.nammamedmate.server.persistence.KioskTicketRepository;
import com.nammamedmate.server.persistence.LocationRepository;
import com.nammamedmate.server.shared.exception.ApiException;
import java.time.Clock;
import java.time.Instant;
import java.util.List;
import java.util.Objects;
import java.util.UUID;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class KioskService {

  static final String PLAN_LIMIT_CODE = "PLAN_LIMIT";
  static final String PLAN_LIMIT_MESSAGE =
      "Self-order kiosk is on the Pro plan. Upgrade this pharmacy to open the kiosk.";
  static final String BRANCH_TYPE_CODE = "BRANCH_TYPE";
  static final String BRANCH_TYPE_MESSAGE =
      "Self-order kiosk runs only at a Kiosk outlet. Switch to that outlet first.";
  static final String NO_BRANCH_CODE = "NO_ACTIVE_BRANCH";
  static final String NO_BRANCH_MESSAGE = "Pick an outlet on this till before opening the kiosk.";
  static final String SESSION_CLOSED_CODE = "SESSION_CLOSED";
  static final String SESSION_CLOSED_MESSAGE = "Open this outlet’s kiosk before taking a pickup.";

  private final AppUserRepository appUserRepository;
  private final LocationRepository locationRepository;
  private final KioskSessionRepository kioskSessionRepository;
  private final KioskTicketRepository kioskTicketRepository;
  private final AccessQueryService accessQueryService;
  private final SubscriptionService subscriptionService;
  private final BranchAssignmentService branchAssignmentService;
  private final Clock clock;

  public KioskService(
      AppUserRepository appUserRepository,
      LocationRepository locationRepository,
      KioskSessionRepository kioskSessionRepository,
      KioskTicketRepository kioskTicketRepository,
      AccessQueryService accessQueryService,
      SubscriptionService subscriptionService,
      BranchAssignmentService branchAssignmentService,
      Clock clock) {
    this.appUserRepository = appUserRepository;
    this.locationRepository = locationRepository;
    this.kioskSessionRepository = kioskSessionRepository;
    this.kioskTicketRepository = kioskTicketRepository;
    this.accessQueryService = accessQueryService;
    this.subscriptionService = subscriptionService;
    this.branchAssignmentService = branchAssignmentService;
    this.clock = clock;
  }

  @Transactional(readOnly = true)
  public KioskView current(AuthPrincipal principal) {
    AppUser user = requireTenantUser(principal);
    UUID branchId = principal.activeBranchId();
    PlanCode plan = subscriptionService.resolvePlan(user.getTenantId());
    boolean planEntitled = PlanModuleEntitlements.entitledForTenant(plan, ModuleCode.KIOSK);
    boolean hasModule = accessQueryService.effectiveModules(user).contains(ModuleCode.KIOSK);
    if (branchId == null) {
      return new KioskView(planEntitled, hasModule, null, null, NO_BRANCH_CODE, null, List.of());
    }
    Location branch = loadVisibleBranch(user, branchId);
    KioskSession open =
        kioskSessionRepository
            .findByTenantIdAndBranchIdAndStatus(
                user.getTenantId(), branch.getId(), KioskSessionStatus.OPEN)
            .orElse(null);
    String block = blockReason(planEntitled, branch.getBranchType(), branchId);
    return toView(planEntitled, hasModule, branch, open, block);
  }

  @Transactional
  public KioskView open(AuthPrincipal principal) {
    Context ctx = requireReady(principal);
    if (ctx.open() != null) {
      throw new ApiException(
          HttpStatus.CONFLICT, "STALE_STATE", "This outlet’s kiosk is already open.");
    }
    Instant now = Instant.now(clock);
    KioskSession session = new KioskSession();
    session.setId(UUID.randomUUID());
    session.setTenantId(ctx.user().getTenantId());
    session.setBranchId(ctx.branch().getId());
    session.setStatus(KioskSessionStatus.OPEN);
    session.setOpenedBy(ctx.user().getId());
    session.setOpenedAt(now);
    session.setNextToken(1);
    session.setCreatedAt(now);
    session.setUpdatedAt(now);
    try {
      kioskSessionRepository.saveAndFlush(session);
    } catch (DataIntegrityViolationException ex) {
      throw new ApiException(
          HttpStatus.CONFLICT, "STALE_STATE", "This outlet’s kiosk is already open.");
    }
    return toView(true, true, ctx.branch(), session, null);
  }

  @Transactional
  public KioskView close(AuthPrincipal principal) {
    Context ctx = requireReady(principal);
    KioskSession open = ctx.open();
    if (open == null) {
      throw new ApiException(
          HttpStatus.CONFLICT, "STALE_STATE", "This outlet’s kiosk is already closed.");
    }
    Instant now = Instant.now(clock);
    open.setStatus(KioskSessionStatus.CLOSED);
    open.setClosedBy(ctx.user().getId());
    open.setClosedAt(now);
    open.setUpdatedAt(now);
    kioskSessionRepository.save(open);
    return toView(true, true, ctx.branch(), null, null);
  }

  @Transactional
  public KioskView createTicket(AuthPrincipal principal, String walkInName, String pickupRequest) {
    Context ctx = requireReady(principal);
    KioskSession open = ctx.open();
    if (open == null) {
      throw new ApiException(
          HttpStatus.UNPROCESSABLE_ENTITY, SESSION_CLOSED_CODE, SESSION_CLOSED_MESSAGE);
    }
    String pickup = requiredPickup(pickupRequest);
    Instant now = Instant.now(clock);
    KioskTicket ticket = new KioskTicket();
    ticket.setId(UUID.randomUUID());
    ticket.setTenantId(ctx.user().getTenantId());
    ticket.setBranchId(ctx.branch().getId());
    ticket.setSessionId(open.getId());
    ticket.setToken(open.getNextToken());
    ticket.setWalkInName(blankToNull(walkInName));
    ticket.setPickupRequest(pickup);
    ticket.setStatus(KioskTicketStatus.WAITING);
    ticket.setCreatedAt(now);
    ticket.setUpdatedAt(now);
    open.setNextToken(open.getNextToken() + 1);
    open.setUpdatedAt(now);
    kioskSessionRepository.save(open);
    kioskTicketRepository.save(ticket);
    return toView(true, true, ctx.branch(), open, null);
  }

  @Transactional
  public KioskView cancelTicket(AuthPrincipal principal, UUID ticketId) {
    Context ctx = requireReady(principal);
    KioskTicket ticket =
        kioskTicketRepository
            .findByIdAndTenantIdAndBranchId(
                ticketId, ctx.user().getTenantId(), ctx.branch().getId())
            .orElseThrow(KioskService::notFound);
    if (ticket.getStatus() != KioskTicketStatus.WAITING) {
      throw new ApiException(
          HttpStatus.CONFLICT, "STALE_STATE", "That pickup slip is no longer waiting.");
    }
    ticket.setStatus(KioskTicketStatus.CANCELLED);
    ticket.setUpdatedAt(Instant.now(clock));
    kioskTicketRepository.save(ticket);
    return toView(true, true, ctx.branch(), ctx.open(), null);
  }

  private Context requireReady(AuthPrincipal principal) {
    AppUser user = requireTenantUser(principal);
    UUID branchId = principal.activeBranchId();
    if (branchId == null) {
      throw new ApiException(HttpStatus.UNPROCESSABLE_ENTITY, NO_BRANCH_CODE, NO_BRANCH_MESSAGE);
    }
    Location branch = loadVisibleBranch(user, branchId);
    PlanCode plan = subscriptionService.resolvePlan(user.getTenantId());
    boolean planEntitled = PlanModuleEntitlements.entitledForTenant(plan, ModuleCode.KIOSK);
    if (!planEntitled) {
      throw new ApiException(HttpStatus.UNPROCESSABLE_ENTITY, PLAN_LIMIT_CODE, PLAN_LIMIT_MESSAGE);
    }
    if (branch.getBranchType() != BranchType.KIOSK) {
      throw new ApiException(
          HttpStatus.UNPROCESSABLE_ENTITY, BRANCH_TYPE_CODE, BRANCH_TYPE_MESSAGE);
    }
    if (!accessQueryService.effectiveModules(user).contains(ModuleCode.KIOSK)) {
      throw forbidden();
    }
    KioskSession open =
        kioskSessionRepository
            .lockOpen(user.getTenantId(), branch.getId(), KioskSessionStatus.OPEN)
            .orElse(null);
    return new Context(user, branch, open);
  }

  private AppUser requireTenantUser(AuthPrincipal principal) {
    AppUser user =
        appUserRepository
            .findById(principal.userId())
            .filter(row -> row.getDeletedAt() == null)
            .filter(row -> row.getStatus() == UserAccountStatus.ACTIVE)
            .orElseThrow(KioskService::forbidden);
    if (user.getTenantId() == null || !Objects.equals(user.getTenantId(), principal.tenantId())) {
      throw forbidden();
    }
    if (user.getRole() == AppUserRole.admin_super
        || user.getRole() == AppUserRole.admin_verification) {
      throw forbidden();
    }
    return user;
  }

  private Location loadVisibleBranch(AppUser user, UUID branchId) {
    Location branch =
        locationRepository
            .findByIdAndTenantIdAndDeletedAtIsNull(branchId, user.getTenantId())
            .orElseThrow(KioskService::notFound);
    if (!branchAssignmentService.canAccessBranch(user, branchId)) {
      throw notFound();
    }
    return branch;
  }

  private KioskView toView(
      boolean planEntitled,
      boolean hasModule,
      Location branch,
      KioskSession open,
      String blockReason) {
    List<KioskView.KioskTicketSlice> tickets = List.of();
    KioskView.KioskSessionSlice session = null;
    if (open != null) {
      session =
          new KioskView.KioskSessionSlice(
              open.getId(), open.getStatus(), open.getOpenedAt(), open.getOpenedBy());
      tickets =
          kioskTicketRepository
              .findByTenantIdAndBranchIdAndSessionIdAndStatusOrderByTokenAsc(
                  branch.getTenantId(), branch.getId(), open.getId(), KioskTicketStatus.WAITING)
              .stream()
              .map(
                  t ->
                      new KioskView.KioskTicketSlice(
                          t.getId(),
                          t.getToken(),
                          t.getWalkInName(),
                          t.getPickupRequest(),
                          t.getCreatedAt()))
              .toList();
    }
    return new KioskView(
        planEntitled,
        hasModule,
        branch.getBranchType().name(),
        branch.getId(),
        blockReason,
        session,
        tickets);
  }

  private static String blockReason(boolean planEntitled, BranchType type, UUID branchId) {
    if (branchId == null) {
      return NO_BRANCH_CODE;
    }
    if (!planEntitled) {
      return PLAN_LIMIT_CODE;
    }
    if (type != BranchType.KIOSK) {
      return BRANCH_TYPE_CODE;
    }
    return null;
  }

  private static String requiredPickup(String pickupRequest) {
    if (pickupRequest == null || pickupRequest.isBlank()) {
      throw new ApiException(HttpStatus.BAD_REQUEST, "VALIDATION_ERROR", "Invalid request");
    }
    String trimmed = pickupRequest.trim();
    if (trimmed.length() > 500) {
      throw new ApiException(HttpStatus.BAD_REQUEST, "VALIDATION_ERROR", "Invalid request");
    }
    return trimmed;
  }

  private static String blankToNull(String value) {
    if (value == null || value.isBlank()) {
      return null;
    }
    return value.trim();
  }

  private static ApiException forbidden() {
    return new ApiException(HttpStatus.FORBIDDEN, "FORBIDDEN", "Access denied");
  }

  private static ApiException notFound() {
    return new ApiException(HttpStatus.NOT_FOUND, "NOT_FOUND", "Not found");
  }

  private record Context(AppUser user, Location branch, KioskSession open) {}
}
