package com.nammamedmate.server.domain;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;

class PlanLimitsTest {

  @Test
  void ac04_canonicalBranchCaps() {
    assertThat(PlanLimits.maxBranches(PlanCode.FREE)).isEqualTo(1);
    assertThat(PlanLimits.maxBranches(PlanCode.STARTER)).isEqualTo(2);
    assertThat(PlanLimits.maxBranches(PlanCode.GROWTH)).isEqualTo(3);
    assertThat(PlanLimits.maxBranches(PlanCode.PRO)).isEqualTo(5);
  }

  @Test
  void ac04_canonicalUserCaps() {
    assertThat(PlanLimits.maxUsers(PlanCode.FREE)).isEqualTo(3);
    assertThat(PlanLimits.maxUsers(PlanCode.STARTER)).isEqualTo(3);
    assertThat(PlanLimits.maxUsers(PlanCode.GROWTH)).isEqualTo(5);
    assertThat(PlanLimits.maxUsers(PlanCode.PRO)).isEqualTo(PlanLimits.UNLIMITED_USERS);
  }

  @Test
  void ac04_masterOverrideRaisesBranchCap() {
    assertThat(PlanLimits.effectiveBranchLimit(PlanCode.FREE, 4)).isEqualTo(4);
    assertThat(PlanLimits.allowsAnotherBranch(PlanCode.FREE, 4, 3)).isTrue();
    assertThat(PlanLimits.allowsAnotherBranch(PlanCode.FREE, null, 1)).isFalse();
  }

  @Test
  void ac05_downgradeRejectedWhenUsageExceedsTarget() {
    assertThat(PlanLimits.usageFitsPlan(PlanCode.FREE, null, 3, 2)).isFalse();
    assertThat(PlanLimits.usageFitsPlan(PlanCode.STARTER, null, 3, 2)).isTrue();
    assertThat(PlanLimits.usageFitsPlan(PlanCode.GROWTH, null, 5, 3)).isTrue();
  }
}
