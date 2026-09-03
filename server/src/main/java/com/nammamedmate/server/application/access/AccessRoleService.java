package com.nammamedmate.server.application.access;

import com.nammamedmate.server.application.subscription.SubscriptionService;
import com.nammamedmate.server.domain.AccessRole;
import com.nammamedmate.server.domain.AccessRoleEvent;
import com.nammamedmate.server.domain.AccessRoleEventAction;
import com.nammamedmate.server.domain.AccessRoleKind;
import com.nammamedmate.server.domain.AccessRoleModule;
import com.nammamedmate.server.domain.AccessRolePolicy;
import com.nammamedmate.server.domain.AccessScope;
import com.nammamedmate.server.domain.AppUser;
import com.nammamedmate.server.domain.ModuleCode;
import com.nammamedmate.server.domain.PlanCode;
import com.nammamedmate.server.domain.PlanModuleEntitlements;
import com.nammamedmate.server.domain.UserAccessRole;
import com.nammamedmate.server.infrastructure.security.AuthPrincipal;
import com.nammamedmate.server.persistence.AccessRoleEventRepository;
import com.nammamedmate.server.persistence.AccessRoleModuleRepository;
import com.nammamedmate.server.persistence.AccessRoleRepository;
import com.nammamedmate.server.persistence.AppUserRepository;
import com.nammamedmate.server.persistence.UserAccessRoleRepository;
import com.nammamedmate.server.shared.exception.ApiException;
import java.time.Clock;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AccessRoleService {

  static final String NOT_FOUND_CODE = "NOT_FOUND";
  static final String NOT_FOUND_MESSAGE = "Role not found.";
  static final String PLAN_LIMIT_CODE = "PLAN_LIMIT";
  static final String PLAN_LIMIT_MESSAGE = "That module is not on the current plan.";
  static final String PRIVILEGE_CODE = "PRIVILEGE_ESCALATION";
  static final String PRIVILEGE_MESSAGE = "That module cannot be granted.";
  static final String NAME_TAKEN_CODE = "ROLE_NAME_TAKEN";
  static final String NAME_TAKEN_MESSAGE = "A role with that name already exists.";
  static final String STALE_CODE = "ROLE_STALE";
  static final String STALE_MESSAGE =
      "This role was updated by someone else. Reload and try again.";
  static final String IMMUTABLE_CODE = "ROLE_IMMUTABLE";
  static final String IMMUTABLE_MESSAGE = "Predefined roles cannot be changed.";
  static final String SCOPE_CODE = "MODULE_SCOPE";
  static final String SCOPE_MESSAGE = "Those modules cannot be used on this role.";

  private final AppUserRepository appUserRepository;
  private final AccessRoleRepository accessRoleRepository;
  private final AccessRoleModuleRepository accessRoleModuleRepository;
  private final UserAccessRoleRepository userAccessRoleRepository;
  private final AccessRoleEventRepository accessRoleEventRepository;
  private final AccessQueryService accessQueryService;
  private final SubscriptionService subscriptionService;
  private final Clock clock;

  public AccessRoleService(
      AppUserRepository appUserRepository,
      AccessRoleRepository accessRoleRepository,
      AccessRoleModuleRepository accessRoleModuleRepository,
      UserAccessRoleRepository userAccessRoleRepository,
      AccessRoleEventRepository accessRoleEventRepository,
      AccessQueryService accessQueryService,
      SubscriptionService subscriptionService,
      Clock clock) {
    this.appUserRepository = appUserRepository;
    this.accessRoleRepository = accessRoleRepository;
    this.accessRoleModuleRepository = accessRoleModuleRepository;
    this.userAccessRoleRepository = userAccessRoleRepository;
    this.accessRoleEventRepository = accessRoleEventRepository;
    this.accessQueryService = accessQueryService;
    this.subscriptionService = subscriptionService;
    this.clock = clock;
  }

  @Transactional(readOnly = true)
  public AccessRoleCatalog list(AuthPrincipal principal) {
    Actor actor = actor(principal);
    List<AccessRole> roles = accessQueryService.visibleRoles(actor.scope(), actor.tenantId());
    Map<UUID, List<String>> modules =
        accessQueryService.modulesByRole(roles.stream().map(AccessRole::getId).toList());
    List<AccessRoleView> views =
        roles.stream()
            .map(
                role ->
                    AccessQueryService.toView(role, modules.getOrDefault(role.getId(), List.of())))
            .sorted(
                Comparator.comparing(AccessRoleView::kind)
                    .thenComparing(AccessRoleView::name, String.CASE_INSENSITIVE_ORDER))
            .toList();
    return new AccessRoleCatalog(views, accessQueryService.catalog(actor.scope(), planFor(actor)));
  }

  @Transactional
  public AccessRoleView create(AuthPrincipal principal, CreateAccessRoleCommand command) {
    Actor actor = actor(principal);
    Set<ModuleCode> requested = requested(command.modules());
    validateGrant(actor, requested);
    String name = requireName(command.name());
    if (customNameTaken(actor, name, null)) {
      throw new ApiException(HttpStatus.CONFLICT, NAME_TAKEN_CODE, NAME_TAKEN_MESSAGE);
    }
    Instant now = Instant.now(clock);
    AccessRole role = new AccessRole();
    role.setId(UUID.randomUUID());
    role.setTenantId(actor.scope() == AccessScope.TENANT ? actor.tenantId() : null);
    role.setScope(actor.scope());
    role.setKind(AccessRoleKind.CUSTOM);
    role.setName(name);
    role.setVersion(1);
    role.setCreatedBy(principal.userId());
    role.setCreatedAt(now);
    role.setUpdatedAt(now);
    accessRoleRepository.saveAndFlush(role);
    replaceModules(role.getId(), requested);
    recordEvent(
        principal.userId(),
        AccessRoleEventAction.CREATED,
        role.getId(),
        null,
        actor.tenantId(),
        requested);
    return AccessQueryService.toView(role, names(requested));
  }

  @Transactional
  public AccessRoleView patch(
      AuthPrincipal principal, UUID roleId, String name, List<ModuleCode> modules, int version) {
    Actor actor = actor(principal);
    AccessRole role = mutableCustom(actor, roleId);
    if (role.getVersion() != version) {
      throw new ApiException(HttpStatus.CONFLICT, STALE_CODE, STALE_MESSAGE);
    }
    Set<ModuleCode> requested = requested(modules);
    validateGrant(actor, requested);
    String nextName = requireName(name);
    if (customNameTaken(actor, nextName, role.getId())) {
      throw new ApiException(HttpStatus.CONFLICT, NAME_TAKEN_CODE, NAME_TAKEN_MESSAGE);
    }
    Instant now = Instant.now(clock);
    role.setName(nextName);
    role.setVersion(role.getVersion() + 1);
    role.setUpdatedAt(now);
    accessRoleModuleRepository.deleteByRoleId(role.getId());
    accessRoleModuleRepository.flush();
    replaceModules(role.getId(), requested);
    recordEvent(
        principal.userId(),
        AccessRoleEventAction.UPDATED,
        role.getId(),
        null,
        actor.tenantId(),
        requested);
    return AccessQueryService.toView(role, names(requested));
  }

  @Transactional
  public AccessRoleView deactivate(AuthPrincipal principal, UUID roleId) {
    Actor actor = actor(principal);
    AccessRole role = mutableCustom(actor, roleId);
    Instant now = Instant.now(clock);
    userAccessRoleRepository.deleteByRoleId(role.getId());
    role.setDeletedAt(now);
    role.setUpdatedAt(now);
    recordEvent(
        principal.userId(),
        AccessRoleEventAction.DEACTIVATED,
        role.getId(),
        null,
        actor.tenantId(),
        Set.of());
    List<String> modules =
        accessQueryService
            .modulesByRole(List.of(role.getId()))
            .getOrDefault(role.getId(), List.of());
    return AccessQueryService.toView(role, modules);
  }

  @Transactional(readOnly = true)
  public UserAccessRoles listUserRoles(AuthPrincipal principal, UUID userId) {
    Actor actor = actor(principal);
    AppUser target = visibleUser(actor, userId, false);
    return new UserAccessRoles(target.getId(), accessQueryService.assignedViews(target));
  }

  @Transactional
  public UserAccessRoles replaceUserRoles(
      AuthPrincipal principal, UUID userId, List<UUID> roleIds) {
    Actor actor = actor(principal);
    AppUser target = visibleUser(actor, userId, true);
    List<UUID> requested = roleIds == null ? List.of() : roleIds;
    List<AccessRole> roles = loadAssignable(actor, requested);
    if (actor.scope() == AccessScope.TENANT) {
      userAccessRoleRepository.deleteByUserIdAndTenantId(target.getId(), actor.tenantId());
    } else {
      userAccessRoleRepository.deleteByUserIdAndTenantIdIsNull(target.getId());
    }
    userAccessRoleRepository.flush();
    Instant now = Instant.now(clock);
    for (AccessRole role : roles) {
      saveAssignment(target, role, actor.tenantId(), now);
      recordEvent(
          principal.userId(),
          AccessRoleEventAction.ASSIGNED,
          role.getId(),
          target.getId(),
          actor.tenantId(),
          Set.of());
    }
    return new UserAccessRoles(target.getId(), accessQueryService.assignedViews(target));
  }

  @Transactional
  public UserAccessRoles addUserRole(AuthPrincipal principal, UUID userId, UUID roleId) {
    Actor actor = actor(principal);
    AppUser target = visibleUser(actor, userId, true);
    AccessRole role = loadAssignable(actor, List.of(roleId)).get(0);
    if (userAccessRoleRepository.findByUserIdAndRoleId(target.getId(), role.getId()).isEmpty()) {
      saveAssignment(target, role, actor.tenantId(), Instant.now(clock));
      recordEvent(
          principal.userId(),
          AccessRoleEventAction.ASSIGNED,
          role.getId(),
          target.getId(),
          actor.tenantId(),
          Set.of());
    }
    return new UserAccessRoles(target.getId(), accessQueryService.assignedViews(target));
  }

  @Transactional
  public UserAccessRoles removeUserRole(AuthPrincipal principal, UUID userId, UUID roleId) {
    Actor actor = actor(principal);
    AppUser target = visibleUser(actor, userId, true);
    AccessRole role = loadAssignable(actor, List.of(roleId)).get(0);
    userAccessRoleRepository.deleteByUserIdAndRoleId(target.getId(), role.getId());
    recordEvent(
        principal.userId(),
        AccessRoleEventAction.UNASSIGNED,
        role.getId(),
        target.getId(),
        actor.tenantId(),
        Set.of());
    return new UserAccessRoles(target.getId(), accessQueryService.assignedViews(target));
  }

  private Actor actor(AuthPrincipal principal) {
    AppUser user =
        appUserRepository
            .findById(principal.userId())
            .filter(row -> row.getDeletedAt() == null)
            .orElseThrow(AccessRoleService::forbidden);
    AccessScope scope = user.getTenantId() == null ? AccessScope.PLATFORM : AccessScope.TENANT;
    Set<ModuleCode> effective = accessQueryService.effectiveModules(user);
    if (!AccessRolePolicy.canManage(effective, scope)) {
      throw forbidden();
    }
    return new Actor(user, scope, user.getTenantId(), effective);
  }

  private void validateGrant(Actor actor, Set<ModuleCode> requested) {
    if (!AccessRolePolicy.sameScope(actor.scope(), requested)) {
      throw new ApiException(HttpStatus.UNPROCESSABLE_ENTITY, SCOPE_CODE, SCOPE_MESSAGE);
    }
    if (actor.scope() == AccessScope.TENANT) {
      PlanCode plan = planFor(actor);
      if (requested.stream()
          .anyMatch(code -> !PlanModuleEntitlements.entitledForTenant(plan, code))) {
        throw new ApiException(
            HttpStatus.UNPROCESSABLE_ENTITY, PLAN_LIMIT_CODE, PLAN_LIMIT_MESSAGE);
      }
    }
    if (!AccessRolePolicy.canGrant(actor.effective(), requested)) {
      throw new ApiException(HttpStatus.UNPROCESSABLE_ENTITY, PRIVILEGE_CODE, PRIVILEGE_MESSAGE);
    }
  }

  private PlanCode planFor(Actor actor) {
    return subscriptionService.resolvePlan(actor.tenantId());
  }

  private AccessRole mutableCustom(Actor actor, UUID roleId) {
    AccessRole role =
        accessRoleRepository.lockById(roleId).orElseThrow(AccessRoleService::notFound);
    if (role.getDeletedAt() != null || !visible(actor, role)) {
      throw notFound();
    }
    if (role.getKind() == AccessRoleKind.PREDEFINED) {
      throw new ApiException(HttpStatus.UNPROCESSABLE_ENTITY, IMMUTABLE_CODE, IMMUTABLE_MESSAGE);
    }
    return role;
  }

  private List<AccessRole> loadAssignable(Actor actor, List<UUID> roleIds) {
    LinkedHashSet<UUID> unique = new LinkedHashSet<>(roleIds);
    List<AccessRole> roles = new ArrayList<>();
    for (UUID id : unique) {
      AccessRole role = accessRoleRepository.findById(id).orElseThrow(AccessRoleService::notFound);
      if (role.getDeletedAt() != null || !visible(actor, role)) {
        throw notFound();
      }
      roles.add(role);
    }
    return roles;
  }

  private boolean visible(Actor actor, AccessRole role) {
    if (role.getScope() != actor.scope()) {
      return false;
    }
    if (role.getKind() == AccessRoleKind.PREDEFINED) {
      return true;
    }
    if (actor.scope() == AccessScope.TENANT) {
      return actor.tenantId().equals(role.getTenantId());
    }
    return role.getTenantId() == null;
  }

  private AppUser visibleUser(Actor actor, UUID userId, boolean lock) {
    AppUser target =
        (lock ? appUserRepository.lockById(userId) : appUserRepository.findById(userId))
            .orElseThrow(AccessRoleService::notFound);
    if (target.getDeletedAt() != null) {
      throw notFound();
    }
    if (actor.scope() == AccessScope.TENANT) {
      if (!actor.tenantId().equals(target.getTenantId())) {
        throw notFound();
      }
    } else if (target.getTenantId() != null) {
      throw notFound();
    }
    return target;
  }

  private boolean customNameTaken(Actor actor, String name, UUID ignoreId) {
    Optional<AccessRole> existing =
        actor.scope() == AccessScope.TENANT
            ? accessRoleRepository.findActiveCustomByTenantIdAndNameIgnoreCase(
                actor.tenantId(), name)
            : accessRoleRepository.findActivePlatformCustomByNameIgnoreCase(name);
    return existing.filter(role -> ignoreId == null || !role.getId().equals(ignoreId)).isPresent();
  }

  private void replaceModules(UUID roleId, Set<ModuleCode> modules) {
    for (ModuleCode code : modules) {
      AccessRoleModule row = new AccessRoleModule();
      row.setId(UUID.randomUUID());
      row.setRoleId(roleId);
      row.setModuleCode(code);
      accessRoleModuleRepository.save(row);
    }
    accessRoleModuleRepository.flush();
  }

  private void saveAssignment(AppUser user, AccessRole role, UUID tenantId, Instant now) {
    UserAccessRole assignment = new UserAccessRole();
    assignment.setId(UUID.randomUUID());
    assignment.setUserId(user.getId());
    assignment.setRoleId(role.getId());
    assignment.setTenantId(tenantId);
    assignment.setCreatedAt(now);
    userAccessRoleRepository.saveAndFlush(assignment);
  }

  private void recordEvent(
      UUID actorId,
      AccessRoleEventAction action,
      UUID roleId,
      UUID targetUserId,
      UUID tenantId,
      Set<ModuleCode> modules) {
    AccessRoleEvent event = new AccessRoleEvent();
    event.setId(UUID.randomUUID());
    event.setActorUserId(actorId);
    event.setAction(action);
    event.setRoleId(roleId);
    event.setTargetUserId(targetUserId);
    event.setTenantId(tenantId);
    event.setModulesSnapshot(String.join(",", names(modules)));
    event.setCreatedAt(Instant.now(clock));
    accessRoleEventRepository.save(event);
  }

  private static Set<ModuleCode> requested(List<ModuleCode> modules) {
    if (modules == null || modules.isEmpty()) {
      throw new ApiException(HttpStatus.BAD_REQUEST, "VALIDATION_ERROR", "Invalid request");
    }
    return new LinkedHashSet<>(modules);
  }

  private static String requireName(String name) {
    if (name == null || name.trim().isEmpty()) {
      throw new ApiException(HttpStatus.BAD_REQUEST, "VALIDATION_ERROR", "Invalid request");
    }
    return name.trim();
  }

  private static List<String> names(Set<ModuleCode> modules) {
    return modules.stream().map(Enum::name).toList();
  }

  private static ApiException notFound() {
    return new ApiException(HttpStatus.NOT_FOUND, NOT_FOUND_CODE, NOT_FOUND_MESSAGE);
  }

  private static ApiException forbidden() {
    return new ApiException(HttpStatus.FORBIDDEN, "FORBIDDEN", "Access denied");
  }

  private record Actor(AppUser user, AccessScope scope, UUID tenantId, Set<ModuleCode> effective) {}
}
