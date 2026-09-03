package com.nammamedmate.server.domain;

import java.util.Arrays;
import java.util.Collections;
import java.util.LinkedHashSet;
import java.util.Set;
import java.util.stream.Collectors;

public final class PlanModuleEntitlements {

  private PlanModuleEntitlements() {}

  public static Set<ModuleCode> entitledTenantModules(PlanCode plan) {
    return allTenantModules().stream()
        .filter(code -> entitledForTenant(plan, code))
        .collect(Collectors.toCollection(LinkedHashSet::new));
  }

  /** Defaults to Free entitlements (post-KYC baseline). */
  public static Set<ModuleCode> entitledTenantModules() {
    return entitledTenantModules(PlanCode.FREE);
  }

  public static Set<ModuleCode> gatedTenantModules() {
    return allTenantModules().stream()
        .filter(ModuleCode::planGated)
        .collect(Collectors.toCollection(LinkedHashSet::new));
  }

  public static Set<ModuleCode> platformModules() {
    return Arrays.stream(ModuleCode.values())
        .filter(ModuleCode::platformModule)
        .collect(Collectors.toCollection(LinkedHashSet::new));
  }

  public static Set<ModuleCode> allTenantModules() {
    return Arrays.stream(ModuleCode.values())
        .filter(ModuleCode::tenantModule)
        .collect(Collectors.toCollection(LinkedHashSet::new));
  }

  public static boolean entitledForTenant(PlanCode plan, ModuleCode code) {
    if (!code.tenantModule()) {
      return false;
    }
    if (code == ModuleCode.LOYALTY) {
      return plan == PlanCode.GROWTH || plan == PlanCode.PRO;
    }
    if (code == ModuleCode.KIOSK) {
      return plan == PlanCode.PRO;
    }
    return !code.planGated();
  }

  /** Defaults to Free entitlements (post-KYC baseline). */
  public static boolean entitledForTenant(ModuleCode code) {
    return entitledForTenant(PlanCode.FREE, code);
  }

  public static Set<ModuleCode> unmodifiable(Set<ModuleCode> modules) {
    return Collections.unmodifiableSet(modules);
  }
}
