package com.nammamedmate.server.domain;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;

class StaffRolePolicyTest {

  @Test
  void ac02_ownerMayGrantOnlyPharmacyStaff() {
    assertThat(StaffRolePolicy.canGrant(AppUserRole.pharmacy_owner, AppUserRole.pharmacy_staff))
        .isTrue();
    assertThat(StaffRolePolicy.canGrant(AppUserRole.pharmacy_owner, AppUserRole.pharmacy_owner))
        .isFalse();
    assertThat(StaffRolePolicy.canGrant(AppUserRole.pharmacy_owner, AppUserRole.admin_super))
        .isFalse();
    assertThat(StaffRolePolicy.canGrant(AppUserRole.pharmacy_owner, AppUserRole.admin_verification))
        .isFalse();
  }

  @Test
  void ac02_masterMayGrantOnlyVerificationAgent() {
    assertThat(StaffRolePolicy.canGrant(AppUserRole.admin_super, AppUserRole.admin_verification))
        .isTrue();
    assertThat(StaffRolePolicy.canGrant(AppUserRole.admin_super, AppUserRole.admin_super))
        .isFalse();
    assertThat(StaffRolePolicy.canGrant(AppUserRole.admin_super, AppUserRole.pharmacy_staff))
        .isFalse();
  }

  @Test
  void ac05_staffAndVerificationAgentCannotCreateAccounts() {
    assertThat(StaffRolePolicy.canCreate(AppUserRole.pharmacy_staff)).isFalse();
    assertThat(StaffRolePolicy.canCreate(AppUserRole.admin_verification)).isFalse();
    assertThat(StaffRolePolicy.canCreate(AppUserRole.pharmacy_owner)).isTrue();
    assertThat(StaffRolePolicy.canCreate(AppUserRole.admin_super)).isTrue();
  }
}
