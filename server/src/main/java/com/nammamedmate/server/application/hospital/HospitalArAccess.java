package com.nammamedmate.server.application.hospital;

import com.nammamedmate.server.application.access.AccessQueryService;
import com.nammamedmate.server.application.branch.BranchAssignmentService;
import com.nammamedmate.server.application.subscription.SubscriptionService;
import com.nammamedmate.server.domain.AppUser;
import com.nammamedmate.server.domain.BranchStatus;
import com.nammamedmate.server.domain.FinanceAccessPolicy;
import com.nammamedmate.server.domain.HospitalPolicy;
import com.nammamedmate.server.domain.Location;
import com.nammamedmate.server.domain.ModuleCode;
import com.nammamedmate.server.domain.PlanCode;
import com.nammamedmate.server.infrastructure.security.AuthPrincipal;
import com.nammamedmate.server.persistence.AppUserRepository;
import com.nammamedmate.server.persistence.LocationRepository;
import com.nammamedmate.server.shared.exception.ApiException;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;

@Component
class HospitalArAccess {

  static final String NO_BRANCH_CODE = "NO_ACTIVE_BRANCH";
  static final String NO_BRANCH_MESSAGE = "Select an outlet before opening hospital billing.";

  private final AppUserRepository appUserRepository;
  private final LocationRepository locationRepository;
  private final AccessQueryService accessQueryService;
  private final SubscriptionService subscriptionService;
  private final BranchAssignmentService branchAssignmentService;

  HospitalArAccess(
      AppUserRepository appUserRepository,
      LocationRepository locationRepository,
      AccessQueryService accessQueryService,
      SubscriptionService subscriptionService,
      BranchAssignmentService branchAssignmentService) {
    this.appUserRepository = appUserRepository;
    this.locationRepository = locationRepository;
    this.accessQueryService = accessQueryService;
    this.subscriptionService = subscriptionService;
    this.branchAssignmentService = branchAssignmentService;
  }

  BranchContext requireStockReader(AuthPrincipal principal) {
    AppUser user = requireTenantUser(principal);
    UUID branchId = requireActiveBranch(principal);
    entitle(user);
    boolean hasHospital = accessQueryService.effectiveModules(user).contains(ModuleCode.HOSPITAL);
    boolean accountant =
        accessQueryService.hasAssignedRoleCode(user, FinanceAccessPolicy.ACCOUNTANT_CODE);
    boolean inventory = accessQueryService.hasAssignedRoleCode(user, HospitalPolicy.INVENTORY_CODE);
    HospitalPolicy.requireStockReader(user.getRole(), accountant, inventory, hasHospital);
    loadVisibleBranch(user, branchId);
    return new BranchContext(user, user.getTenantId(), branchId);
  }

  BranchContext requireAccountWriter(AuthPrincipal principal) {
    AppUser user = requireTenantUser(principal);
    UUID branchId = requireActiveBranch(principal);
    entitle(user);
    boolean hasHospital = accessQueryService.effectiveModules(user).contains(ModuleCode.HOSPITAL);
    boolean accountant =
        accessQueryService.hasAssignedRoleCode(user, FinanceAccessPolicy.ACCOUNTANT_CODE);
    HospitalPolicy.requireAccountWriter(user.getRole(), accountant, hasHospital);
    loadVisibleBranch(user, branchId);
    return new BranchContext(user, user.getTenantId(), branchId);
  }

  Location loadVisibleBranch(AppUser user, UUID branchId) {
    Location branch =
        locationRepository
            .findByIdAndTenantIdAndDeletedAtIsNull(branchId, user.getTenantId())
            .orElseThrow(HospitalPolicy::notFound);
    if (branch.getStatus() != BranchStatus.ACTIVE) {
      throw HospitalPolicy.notFound();
    }
    if (!branchAssignmentService.canAccessBranch(user, branchId)) {
      throw HospitalPolicy.notFound();
    }
    return branch;
  }

  private void entitle(AppUser user) {
    PlanCode plan = subscriptionService.resolvePlan(user.getTenantId());
    HospitalPolicy.assertEntitled(plan);
  }

  private UUID requireActiveBranch(AuthPrincipal principal) {
    if (principal.activeBranchId() == null) {
      throw new ApiException(HttpStatus.UNPROCESSABLE_ENTITY, NO_BRANCH_CODE, NO_BRANCH_MESSAGE);
    }
    return principal.activeBranchId();
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

  record BranchContext(AppUser user, UUID tenantId, UUID branchId) {}
}
