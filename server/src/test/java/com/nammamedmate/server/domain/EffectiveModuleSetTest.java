package com.nammamedmate.server.domain;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.Set;
import org.junit.jupiter.api.Test;

class EffectiveModuleSetTest {

  @Test
  void ac04_proOwnerReceivesKioskModule() {
    assertThat(EffectiveModuleSet.resolve(AppUserRole.pharmacy_owner, Set.of(), PlanCode.PRO))
        .contains(ModuleCode.KIOSK, ModuleCode.LOYALTY);
  }

  @Test
  void ac04_ownerHasEveryEntitledTenantModuleWithoutAssignments() {
    assertThat(EffectiveModuleSet.resolve(AppUserRole.pharmacy_owner, Set.of()))
        .isEqualTo(PlanModuleEntitlements.entitledTenantModules())
        .contains(ModuleCode.SALES, ModuleCode.ROLES, ModuleCode.STAFF, ModuleCode.COMPLIANCE)
        .doesNotContain(ModuleCode.LOYALTY, ModuleCode.KIOSK, ModuleCode.TENANT_KYC);
  }

  @Test
  void ac04_masterHasEveryPlatformModule() {
    assertThat(EffectiveModuleSet.resolve(AppUserRole.admin_super, Set.of()))
        .isEqualTo(PlanModuleEntitlements.platformModules())
        .contains(ModuleCode.PLATFORM_ROLES, ModuleCode.STAFF_VERIFICATION);
  }

  @Test
  void ac01_staffUnionsAssignedEntitledModulesOnly() {
    assertThat(
            EffectiveModuleSet.resolve(
                AppUserRole.pharmacy_staff,
                Set.of(ModuleCode.SALES, ModuleCode.CRM, ModuleCode.LOYALTY, ModuleCode.KIOSK)))
        .containsExactlyInAnyOrder(ModuleCode.SALES, ModuleCode.CRM);
  }
}
