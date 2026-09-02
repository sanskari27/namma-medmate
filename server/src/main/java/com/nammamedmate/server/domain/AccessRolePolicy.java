package com.nammamedmate.server.domain;

import java.util.Set;

public final class AccessRolePolicy {

  private AccessRolePolicy() {}

  public static boolean canManage(Set<ModuleCode> effective, AccessScope scope) {
    if (effective == null || effective.isEmpty()) {
      return false;
    }
    if (scope == AccessScope.TENANT) {
      return effective.contains(ModuleCode.ROLES);
    }
    return effective.contains(ModuleCode.PLATFORM_ROLES);
  }

  public static boolean canGrant(Set<ModuleCode> creatorEffective, Set<ModuleCode> requested) {
    if (requested == null || requested.isEmpty() || creatorEffective == null) {
      return false;
    }
    return creatorEffective.containsAll(requested);
  }

  public static boolean sameScope(AccessScope scope, Set<ModuleCode> requested) {
    if (requested == null || requested.isEmpty()) {
      return false;
    }
    if (scope == AccessScope.TENANT) {
      return requested.stream().allMatch(ModuleCode::tenantModule);
    }
    return requested.stream().allMatch(ModuleCode::platformModule);
  }
}
