package com.nammamedmate.server.domain;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;

class StaffQuotaTest {

  @Test
  void ac05_freePlanAllowsOwnerPlusTwoSubAccounts() {
    assertThat(StaffQuota.allowsAnother(0)).isTrue();
    assertThat(StaffQuota.allowsAnother(2)).isTrue();
    assertThat(StaffQuota.allowsAnother(3)).isFalse();
    assertThat(StaffQuota.allowsAnother(4)).isFalse();
  }
}
