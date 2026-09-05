package com.nammamedmate.server.domain;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;

class ModuleCatalogTest {

  @Test
  void ac03_permissionsAreModuleCodesNotActions() {
    assertThat(ModuleCode.SALES.tenantModule()).isTrue();
    assertThat(ModuleCode.PLATFORM_ROLES.platformModule()).isTrue();
    assertThat(ModuleCode.LOYALTY.planGated()).isTrue();
    assertThat(ModuleCode.KIOSK.planGated()).isTrue();
    assertThat(ModuleCode.KIOSK.tenantModule()).isTrue();
    assertThat(ModuleCode.SALES.planGated()).isFalse();
    assertThat(ModuleCode.COMPLIANCE.tenantModule()).isTrue();
    assertThat(ModuleCode.COMPLIANCE.planGated()).isFalse();
    assertThat(ModuleCode.ONLINE_STORE.tenantModule()).isFalse();
    assertThat(ModuleCode.ONLINE_STORE.platformModule()).isFalse();
  }
}
