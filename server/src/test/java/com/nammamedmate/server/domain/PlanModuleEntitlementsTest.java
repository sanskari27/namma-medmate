package com.nammamedmate.server.domain;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;

class PlanModuleEntitlementsTest {

  @Test
  void ac02_freePlanExcludesLoyaltyAndOnlineStore() {
    assertThat(PlanModuleEntitlements.entitledForTenant(PlanCode.FREE, ModuleCode.SALES)).isTrue();
    assertThat(PlanModuleEntitlements.entitledForTenant(PlanCode.FREE, ModuleCode.ROLES)).isTrue();
    assertThat(PlanModuleEntitlements.entitledForTenant(PlanCode.FREE, ModuleCode.LOYALTY))
        .isFalse();
    assertThat(PlanModuleEntitlements.entitledForTenant(ModuleCode.ONLINE_STORE)).isFalse();
    assertThat(PlanModuleEntitlements.gatedTenantModules()).containsExactly(ModuleCode.LOYALTY);
    assertThat(PlanModuleEntitlements.allTenantModules()).doesNotContain(ModuleCode.ONLINE_STORE);
    assertThat(PlanModuleEntitlements.platformModules()).doesNotContain(ModuleCode.ONLINE_STORE);
    assertThat(ModuleCode.ONLINE_STORE.tenantModule()).isFalse();
    assertThat(ModuleCode.ONLINE_STORE.platformModule()).isFalse();
  }

  @Test
  void ac04_growthEntitlesLoyaltyWithoutOnlineStore() {
    assertThat(PlanModuleEntitlements.entitledForTenant(PlanCode.GROWTH, ModuleCode.LOYALTY))
        .isTrue();
    assertThat(PlanModuleEntitlements.entitledForTenant(PlanCode.PRO, ModuleCode.LOYALTY)).isTrue();
    assertThat(PlanModuleEntitlements.entitledForTenant(PlanCode.STARTER, ModuleCode.LOYALTY))
        .isFalse();
    assertThat(PlanModuleEntitlements.entitledTenantModules(PlanCode.GROWTH))
        .doesNotContain(ModuleCode.ONLINE_STORE);
  }

  @Test
  void ac03_catalogIsModuleLevelNotActionLevel() {
    assertThat(ModuleCode.values())
        .noneMatch(code -> code.name().contains("WRITE") || code.name().contains(":"));
  }
}
