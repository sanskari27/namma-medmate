package com.nammamedmate.server.application.access;

import com.nammamedmate.server.application.subscription.SubscriptionService;
import com.nammamedmate.server.domain.AccessRole;
import com.nammamedmate.server.domain.AccessRoleKind;
import com.nammamedmate.server.domain.AccessRoleModule;
import com.nammamedmate.server.domain.AccessScope;
import com.nammamedmate.server.domain.AppUser;
import com.nammamedmate.server.domain.EffectiveModuleSet;
import com.nammamedmate.server.domain.ModuleCode;
import com.nammamedmate.server.domain.PlanCode;
import com.nammamedmate.server.domain.PlanModuleEntitlements;
import com.nammamedmate.server.domain.UserAccessRole;
import com.nammamedmate.server.persistence.AccessRoleModuleRepository;
import com.nammamedmate.server.persistence.AccessRoleRepository;
import com.nammamedmate.server.persistence.AppUserRepository;
import com.nammamedmate.server.persistence.UserAccessRoleRepository;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AccessQueryService {

  private final AppUserRepository appUserRepository;
  private final AccessRoleRepository accessRoleRepository;
  private final AccessRoleModuleRepository accessRoleModuleRepository;
  private final UserAccessRoleRepository userAccessRoleRepository;
  private final SubscriptionService subscriptionService;

  public AccessQueryService(
      AppUserRepository appUserRepository,
      AccessRoleRepository accessRoleRepository,
      AccessRoleModuleRepository accessRoleModuleRepository,
      UserAccessRoleRepository userAccessRoleRepository,
      SubscriptionService subscriptionService) {
    this.appUserRepository = appUserRepository;
    this.accessRoleRepository = accessRoleRepository;
    this.accessRoleModuleRepository = accessRoleModuleRepository;
    this.userAccessRoleRepository = userAccessRoleRepository;
    this.subscriptionService = subscriptionService;
  }

  @Transactional(readOnly = true)
  public AccessIdentity identity(UUID userId) {
    AppUser user = appUserRepository.findById(userId).orElse(null);
    if (user == null || user.getDeletedAt() != null) {
      return new AccessIdentity(List.of(), List.of());
    }
    List<AccessRoleView> assigned = assignedViews(user);
    Set<ModuleCode> assignedModules =
        assigned.stream()
            .flatMap(view -> view.modules().stream())
            .map(ModuleCode::valueOf)
            .collect(Collectors.toCollection(LinkedHashSet::new));
    List<String> modules =
        EffectiveModuleSet.resolve(user.getRole(), assignedModules, planFor(user)).stream()
            .map(Enum::name)
            .toList();
    return new AccessIdentity(assigned, modules);
  }

  @Transactional(readOnly = true)
  public Set<ModuleCode> effectiveModules(AppUser user) {
    List<AccessRoleView> assigned = assignedViews(user);
    Set<ModuleCode> assignedModules =
        assigned.stream()
            .flatMap(view -> view.modules().stream())
            .map(ModuleCode::valueOf)
            .collect(Collectors.toCollection(LinkedHashSet::new));
    return EffectiveModuleSet.resolve(user.getRole(), assignedModules, planFor(user));
  }

  List<AccessRoleView> assignedViews(AppUser user) {
    List<UserAccessRole> assignments =
        user.getTenantId() == null
            ? userAccessRoleRepository.findByUserIdAndTenantIdIsNull(user.getId())
            : userAccessRoleRepository.findByUserIdAndTenantId(user.getId(), user.getTenantId());
    if (assignments.isEmpty()) {
      return List.of();
    }
    List<UUID> roleIds = assignments.stream().map(UserAccessRole::getRoleId).toList();
    Map<UUID, AccessRole> roles =
        accessRoleRepository.findAllById(roleIds).stream()
            .filter(role -> role.getDeletedAt() == null)
            .collect(Collectors.toMap(AccessRole::getId, role -> role));
    Map<UUID, List<String>> modules = modulesByRole(roles.keySet());
    List<AccessRoleView> views = new ArrayList<>();
    for (UserAccessRole assignment : assignments) {
      AccessRole role = roles.get(assignment.getRoleId());
      if (role == null) {
        continue;
      }
      views.add(toView(role, modules.getOrDefault(role.getId(), List.of())));
    }
    views.sort(Comparator.comparing(AccessRoleView::name, String.CASE_INSENSITIVE_ORDER));
    return views;
  }

  Map<UUID, List<String>> modulesByRole(Iterable<UUID> roleIds) {
    List<UUID> ids = new ArrayList<>();
    roleIds.forEach(ids::add);
    if (ids.isEmpty()) {
      return Map.of();
    }
    return accessRoleModuleRepository.findByRoleIdIn(ids).stream()
        .collect(
            Collectors.groupingBy(
                AccessRoleModule::getRoleId,
                Collectors.mapping(
                    row -> row.getModuleCode().name(),
                    Collectors.collectingAndThen(
                        Collectors.toCollection(LinkedHashSet::new), List::copyOf))));
  }

  List<ModuleCatalogItem> catalog(AccessScope scope, PlanCode plan) {
    if (scope == AccessScope.PLATFORM) {
      return PlanModuleEntitlements.platformModules().stream()
          .map(code -> new ModuleCatalogItem(code.name(), true, false, null))
          .toList();
    }
    PlanCode effective = plan == null ? PlanCode.FREE : plan;
    List<ModuleCatalogItem> items = new ArrayList<>();
    for (ModuleCode code : PlanModuleEntitlements.allTenantModules()) {
      boolean entitled = PlanModuleEntitlements.entitledForTenant(effective, code);
      items.add(
          new ModuleCatalogItem(
              code.name(),
              entitled,
              code.planGated(),
              code.planGated() && !entitled ? "Not included in the current plan." : null));
    }
    return items;
  }

  List<ModuleCatalogItem> catalog(AccessScope scope) {
    return catalog(scope, PlanCode.FREE);
  }

  private PlanCode planFor(AppUser user) {
    return subscriptionService.resolvePlan(user.getTenantId());
  }

  static AccessRoleView toView(AccessRole role, List<String> modules) {
    return new AccessRoleView(
        role.getId(),
        role.getName(),
        role.getCode(),
        role.getKind(),
        role.getScope(),
        role.getVersion(),
        modules);
  }

  List<AccessRole> visibleRoles(AccessScope scope, UUID tenantId) {
    List<AccessRole> roles = new ArrayList<>();
    roles.addAll(
        accessRoleRepository.findByScopeAndKindAndDeletedAtIsNull(
            scope, AccessRoleKind.PREDEFINED));
    if (scope == AccessScope.TENANT) {
      roles.addAll(
          accessRoleRepository.findByTenantIdAndKindAndDeletedAtIsNull(
              tenantId, AccessRoleKind.CUSTOM));
    } else {
      roles.addAll(
          accessRoleRepository.findByTenantIdIsNullAndScopeAndKindAndDeletedAtIsNull(
              AccessScope.PLATFORM, AccessRoleKind.CUSTOM));
    }
    return roles;
  }
}
