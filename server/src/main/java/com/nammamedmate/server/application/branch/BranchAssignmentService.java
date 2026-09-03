package com.nammamedmate.server.application.branch;

import com.nammamedmate.server.domain.AppUser;
import com.nammamedmate.server.domain.AppUserRole;
import com.nammamedmate.server.domain.BranchStatus;
import com.nammamedmate.server.domain.Location;
import com.nammamedmate.server.domain.UserAccountStatus;
import com.nammamedmate.server.domain.UserBranch;
import com.nammamedmate.server.infrastructure.security.AuthPrincipal;
import com.nammamedmate.server.persistence.AppUserRepository;
import com.nammamedmate.server.persistence.LocationRepository;
import com.nammamedmate.server.persistence.UserBranchRepository;
import com.nammamedmate.server.persistence.UserSessionRepository;
import com.nammamedmate.server.shared.exception.ApiException;
import java.time.Clock;
import java.time.Instant;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Objects;
import java.util.Set;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class BranchAssignmentService {

  private final AppUserRepository appUserRepository;
  private final LocationRepository locationRepository;
  private final UserBranchRepository userBranchRepository;
  private final UserSessionRepository userSessionRepository;
  private final Clock clock;

  public BranchAssignmentService(
      AppUserRepository appUserRepository,
      LocationRepository locationRepository,
      UserBranchRepository userBranchRepository,
      UserSessionRepository userSessionRepository,
      Clock clock) {
    this.appUserRepository = appUserRepository;
    this.locationRepository = locationRepository;
    this.userBranchRepository = userBranchRepository;
    this.userSessionRepository = userSessionRepository;
    this.clock = clock;
  }

  @Transactional(readOnly = true)
  public UserBranches listUserBranches(AuthPrincipal principal, UUID userId) {
    Actor actor = requireOwner(principal);
    AppUser target = visibleStaff(actor, userId, false);
    return new UserBranches(target.getId(), assignedViews(actor.tenantId(), target));
  }

  @Transactional
  public UserBranches replaceUserBranches(
      AuthPrincipal principal, UUID userId, List<UUID> branchIds) {
    Actor actor = requireOwner(principal);
    AppUser target = visibleStaff(actor, userId, true);
    List<Location> branches = loadAssignable(actor.tenantId(), branchIds);
    userBranchRepository.deleteByTenantIdAndUserId(actor.tenantId(), target.getId());
    userBranchRepository.flush();
    Instant now = Instant.now(clock);
    for (Location branch : branches) {
      saveAssignment(actor.tenantId(), target.getId(), branch.getId(), now);
    }
    syncSessionActiveBranches(target.getId(), branches.stream().map(Location::getId).toList());
    return new UserBranches(target.getId(), assignedViews(actor.tenantId(), target));
  }

  @Transactional
  public UserBranches addUserBranch(AuthPrincipal principal, UUID userId, UUID branchId) {
    Actor actor = requireOwner(principal);
    AppUser target = visibleStaff(actor, userId, true);
    Location branch = loadAssignable(actor.tenantId(), List.of(branchId)).get(0);
    if (!userBranchRepository.existsByTenantIdAndUserIdAndBranchId(
        actor.tenantId(), target.getId(), branch.getId())) {
      saveAssignment(actor.tenantId(), target.getId(), branch.getId(), Instant.now(clock));
    }
    return new UserBranches(target.getId(), assignedViews(actor.tenantId(), target));
  }

  @Transactional
  public UserBranches removeUserBranch(AuthPrincipal principal, UUID userId, UUID branchId) {
    Actor actor = requireOwner(principal);
    AppUser target = visibleStaff(actor, userId, true);
    loadAssignable(actor.tenantId(), List.of(branchId));
    userBranchRepository.deleteByTenantIdAndUserIdAndBranchId(
        actor.tenantId(), target.getId(), branchId);
    List<UUID> remaining =
        assignedViews(actor.tenantId(), target).stream().map(AssignedBranchView::id).toList();
    syncSessionActiveBranches(target.getId(), remaining);
    return new UserBranches(target.getId(), assignedViews(actor.tenantId(), target));
  }

  private void syncSessionActiveBranches(UUID userId, List<UUID> allowedBranchIds) {
    if (allowedBranchIds.isEmpty()) {
      userSessionRepository.clearActiveBranch(userId);
      return;
    }
    userSessionRepository.clearActiveBranchIfNotIn(userId, allowedBranchIds);
  }

  @Transactional(readOnly = true)
  public List<AssignedBranchView> visibleBranchesFor(AppUser user) {
    if (user.getTenantId() == null) {
      return List.of();
    }
    if (user.getRole() == AppUserRole.pharmacy_owner) {
      return locationRepository
          .findAllByTenantIdAndDeletedAtIsNullOrderByBranchCodeAsc(user.getTenantId())
          .stream()
          .map(BranchAssignmentService::toView)
          .toList();
    }
    return assignedViews(user.getTenantId(), user);
  }

  @Transactional(readOnly = true)
  public boolean canAccessBranch(AppUser user, UUID branchId) {
    if (user.getTenantId() == null || branchId == null) {
      return false;
    }
    Location branch =
        locationRepository
            .findByIdAndTenantIdAndDeletedAtIsNull(branchId, user.getTenantId())
            .orElse(null);
    if (branch == null || branch.getStatus() != BranchStatus.ACTIVE) {
      return false;
    }
    if (user.getRole() == AppUserRole.pharmacy_owner) {
      return true;
    }
    return userBranchRepository.existsByTenantIdAndUserIdAndBranchId(
        user.getTenantId(), user.getId(), branchId);
  }

  @Transactional(readOnly = true)
  public void assertCanAccess(AuthPrincipal principal, UUID branchId) {
    AppUser user =
        appUserRepository
            .findById(principal.userId())
            .filter(row -> row.getDeletedAt() == null)
            .orElseThrow(BranchAssignmentService::forbidden);
    if (!canAccessBranch(user, branchId)) {
      throw forbidden();
    }
  }

  @Transactional(readOnly = true)
  public void assertActiveBranchAllowed(AuthPrincipal principal) {
    if (principal.activeBranchId() == null) {
      if (principal.role() == AppUserRole.pharmacy_owner) {
        return;
      }
      throw forbidden();
    }
    assertCanAccess(principal, principal.activeBranchId());
  }

  private List<AssignedBranchView> assignedViews(UUID tenantId, AppUser user) {
    List<UserBranch> rows =
        userBranchRepository.findAllByTenantIdAndUserIdOrderByCreatedAtAsc(tenantId, user.getId());
    List<AssignedBranchView> views = new ArrayList<>();
    for (UserBranch row : rows) {
      locationRepository
          .findByIdAndTenantIdAndDeletedAtIsNull(row.getBranchId(), tenantId)
          .map(BranchAssignmentService::toView)
          .ifPresent(views::add);
    }
    return views;
  }

  private List<Location> loadAssignable(UUID tenantId, List<UUID> branchIds) {
    if (branchIds == null) {
      return List.of();
    }
    Set<UUID> unique = new LinkedHashSet<>(branchIds);
    List<Location> branches = new ArrayList<>();
    for (UUID id : unique) {
      if (id == null) {
        throw new ApiException(HttpStatus.BAD_REQUEST, "VALIDATION_ERROR", "Invalid request");
      }
      Location branch =
          locationRepository
              .findByIdAndTenantIdAndDeletedAtIsNull(id, tenantId)
              .orElseThrow(BranchAssignmentService::notFound);
      if (branch.getStatus() != BranchStatus.ACTIVE) {
        throw new ApiException(
            HttpStatus.UNPROCESSABLE_ENTITY, "BRANCH_INACTIVE", "Branch is not active");
      }
      branches.add(branch);
    }
    return branches;
  }

  private void saveAssignment(UUID tenantId, UUID userId, UUID branchId, Instant now) {
    UserBranch row = new UserBranch();
    row.setId(UUID.randomUUID());
    row.setTenantId(tenantId);
    row.setUserId(userId);
    row.setBranchId(branchId);
    row.setCreatedAt(now);
    userBranchRepository.save(row);
  }

  private Actor requireOwner(AuthPrincipal principal) {
    AppUser user =
        appUserRepository
            .findById(principal.userId())
            .filter(row -> row.getDeletedAt() == null)
            .filter(row -> row.getStatus() == UserAccountStatus.ACTIVE)
            .orElseThrow(BranchAssignmentService::forbidden);
    if (user.getRole() != AppUserRole.pharmacy_owner || user.getTenantId() == null) {
      throw forbidden();
    }
    return new Actor(user, user.getTenantId());
  }

  private AppUser visibleStaff(Actor actor, UUID userId, boolean forWrite) {
    AppUser target =
        appUserRepository
            .findById(userId)
            .filter(row -> row.getDeletedAt() == null)
            .orElseThrow(BranchAssignmentService::notFound);
    if (!Objects.equals(target.getTenantId(), actor.tenantId())) {
      throw notFound();
    }
    if (target.getRole() != AppUserRole.pharmacy_staff) {
      throw new ApiException(
          HttpStatus.UNPROCESSABLE_ENTITY,
          "INVALID_TARGET",
          "Only pharmacy staff can be assigned to branches");
    }
    if (forWrite && target.getStatus() != UserAccountStatus.ACTIVE) {
      throw new ApiException(
          HttpStatus.UNPROCESSABLE_ENTITY, "ACCOUNT_INACTIVE", "Staff account is not active");
    }
    return target;
  }

  private static AssignedBranchView toView(Location branch) {
    return new AssignedBranchView(
        branch.getId(), branch.getName(), branch.getBranchCode(), branch.getStatus());
  }

  private static ApiException notFound() {
    return new ApiException(HttpStatus.NOT_FOUND, "NOT_FOUND", "Not found");
  }

  private static ApiException forbidden() {
    return new ApiException(HttpStatus.FORBIDDEN, "FORBIDDEN", "Access denied");
  }

  private record Actor(AppUser user, UUID tenantId) {}
}
