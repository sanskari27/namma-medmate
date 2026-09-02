package com.nammamedmate.server.domain;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;

class StaffLicenseRulesTest {

  @Test
  void ac05_pharmacistRequiresLicenseNumber() {
    assertThat(StaffLicenseRules.valid(StaffRegistrationKind.PHARMACIST, "KA-PCI-1")).isTrue();
    assertThat(StaffLicenseRules.valid(StaffRegistrationKind.PHARMACIST, null)).isFalse();
    assertThat(StaffLicenseRules.valid(StaffRegistrationKind.PHARMACIST, "  ")).isFalse();
  }

  @Test
  void ac05_staffRegistrationAllowsOptionalLicense() {
    assertThat(StaffLicenseRules.valid(StaffRegistrationKind.STAFF, null)).isTrue();
    assertThat(StaffLicenseRules.valid(StaffRegistrationKind.STAFF, "")).isTrue();
    assertThat(StaffLicenseRules.valid(StaffRegistrationKind.STAFF, "REG-9")).isTrue();
  }
}
