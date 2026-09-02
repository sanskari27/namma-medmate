package com.nammamedmate.server.domain;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;

class PlanModuleEntitlementsTest {

  @Test
  void ac02_freePlanExcludesLoyaltyAndOnlineStore() {
    assertThat(PlanModuleEntitlements.entitledForTenant(ModuleCode.SALES)).isTrue();
    assertThat(PlanModuleEntitlements.entitledForTenant(ModuleCode.ROLES)).isTrue();
    assertThat(PlanModuleEntitlements.entitledForTenant(ModuleCode.LOYALTY)).isFalse();
    assertThat(PlanModuleEntitlements.entitledForTenant(ModuleCode.ONLINE_STORE)).isFalse();
    assertThat(PlanModuleEntitlements.gatedTenantModules())
        .containsExactly(ModuleCode.LOYALTY, ModuleCode.ONLINE_STORE);
  }

  @Test
  void ac03_catalogIsModuleLevelNotActionLevel() {
    assertThat(ModuleCode.values())
        .noneMatch(code -> code.name().contains("WRITE") || code.name().contains(":"));
  }
}
