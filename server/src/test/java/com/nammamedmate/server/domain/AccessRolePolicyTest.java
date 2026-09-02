package com.nammamedmate.server.domain;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.Set;
import org.junit.jupiter.api.Test;

class AccessRolePolicyTest {

  @Test
  void ac05_manageRequiresRolesModule() {
    assertThat(AccessRolePolicy.canManage(Set.of(ModuleCode.SALES), AccessScope.TENANT)).isFalse();
    assertThat(AccessRolePolicy.canManage(Set.of(ModuleCode.ROLES), AccessScope.TENANT)).isTrue();
    assertThat(AccessRolePolicy.canManage(Set.of(ModuleCode.PLATFORM_ROLES), AccessScope.PLATFORM))
        .isTrue();
  }

  @Test
  void ac02_creatorCannotGrantModuleTheyLack() {
    Set<ModuleCode> creator = Set.of(ModuleCode.ROLES, ModuleCode.SALES);
    assertThat(AccessRolePolicy.canGrant(creator, Set.of(ModuleCode.SALES))).isTrue();
    assertThat(AccessRolePolicy.canGrant(creator, Set.of(ModuleCode.INVENTORY))).isFalse();
  }

  @Test
  void ac03_requestedModulesMustMatchScope() {
    assertThat(AccessRolePolicy.sameScope(AccessScope.TENANT, Set.of(ModuleCode.SALES))).isTrue();
    assertThat(
            AccessRolePolicy.sameScope(
                AccessScope.TENANT, Set.of(ModuleCode.SALES, ModuleCode.TENANT_KYC)))
        .isFalse();
    assertThat(
            AccessRolePolicy.sameScope(AccessScope.PLATFORM, Set.of(ModuleCode.STAFF_VERIFICATION)))
        .isTrue();
  }
}
