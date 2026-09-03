package com.nammamedmate.server.domain;

import java.util.LinkedHashSet;
import java.util.Set;
import java.util.stream.Collectors;

public final class EffectiveModuleSet {

  private EffectiveModuleSet() {}

  public static Set<ModuleCode> resolve(AppUserRole accountClass, Set<ModuleCode> assigned) {
    return resolve(accountClass, assigned, PlanCode.FREE);
  }

  public static Set<ModuleCode> resolve(
      AppUserRole accountClass, Set<ModuleCode> assigned, PlanCode plan) {
    PlanCode effectivePlan = plan == null ? PlanCode.FREE : plan;
    if (accountClass == AppUserRole.pharmacy_owner) {
      return PlanModuleEntitlements.entitledTenantModules(effectivePlan);
    }
    if (accountClass == AppUserRole.admin_super) {
      return PlanModuleEntitlements.platformModules();
    }
    Set<ModuleCode> source = assigned == null ? Set.of() : assigned;
    if (accountClass == AppUserRole.pharmacy_staff) {
      return source.stream()
          .filter(code -> PlanModuleEntitlements.entitledForTenant(effectivePlan, code))
          .collect(Collectors.toCollection(LinkedHashSet::new));
    }
    return source.stream()
        .filter(ModuleCode::platformModule)
        .collect(Collectors.toCollection(LinkedHashSet::new));
  }
}
