package com.nammamedmate.server.domain;

import java.util.Arrays;
import java.util.Collections;
import java.util.LinkedHashSet;
import java.util.Set;
import java.util.stream.Collectors;

public final class PlanModuleEntitlements {

  private PlanModuleEntitlements() {}

  public static Set<ModuleCode> entitledTenantModules() {
    return Arrays.stream(ModuleCode.values())
        .filter(ModuleCode::tenantModule)
        .filter(code -> !code.planGated())
        .collect(Collectors.toCollection(LinkedHashSet::new));
  }

  public static Set<ModuleCode> gatedTenantModules() {
    return Arrays.stream(ModuleCode.values())
        .filter(ModuleCode::tenantModule)
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

  public static boolean entitledForTenant(ModuleCode code) {
    return code.tenantModule() && !code.planGated();
  }

  public static Set<ModuleCode> unmodifiable(Set<ModuleCode> modules) {
    return Collections.unmodifiableSet(modules);
  }
}
