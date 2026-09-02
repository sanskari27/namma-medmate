package com.nammamedmate.server.domain;

import java.util.LinkedHashSet;
import java.util.Set;
import java.util.stream.Collectors;

public final class EffectiveModuleSet {

  private EffectiveModuleSet() {}

  public static Set<ModuleCode> resolve(AppUserRole accountClass, Set<ModuleCode> assigned) {
    if (accountClass == AppUserRole.pharmacy_owner) {
      return PlanModuleEntitlements.entitledTenantModules();
    }
    if (accountClass == AppUserRole.admin_super) {
      return PlanModuleEntitlements.platformModules();
    }
    Set<ModuleCode> source = assigned == null ? Set.of() : assigned;
    if (accountClass == AppUserRole.pharmacy_staff) {
      return source.stream()
          .filter(PlanModuleEntitlements::entitledForTenant)
          .collect(Collectors.toCollection(LinkedHashSet::new));
    }
    return source.stream()
        .filter(ModuleCode::platformModule)
        .collect(Collectors.toCollection(LinkedHashSet::new));
  }
}
