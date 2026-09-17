package com.nammamedmate.server.domain;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.EnumSet;
import java.util.Set;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.junit.jupiter.params.provider.EnumSource;

class TenantStatusTransitionTest {

  @ParameterizedTest
  @CsvSource({
    "ACTIVE,SUSPENDED",
    "ACTIVE,EXPIRED",
    "ACTIVE,TERMINATED",
    "SUSPENDED,ACTIVE",
    "SUSPENDED,TERMINATED",
    "EXPIRED,ACTIVE",
    "EXPIRED,TERMINATED",
    "VERIFICATION_REQUIRED,SUSPENDED",
    "VERIFICATION_REQUIRED,TERMINATED"
  })
  void ac01_documentedEdgesAreAllowed(TenantStatus from, TenantStatus to) {
    assertThat(TenantStatusTransition.isAllowed(from, to)).isTrue();
    assertThat(TenantStatusTransition.allowedFrom(from)).contains(to);
  }

  @ParameterizedTest
  @CsvSource({
    "ACTIVE,ACTIVE",
    "ACTIVE,VERIFICATION_REQUIRED",
    "SUSPENDED,SUSPENDED",
    "SUSPENDED,EXPIRED",
    "SUSPENDED,VERIFICATION_REQUIRED",
    "EXPIRED,EXPIRED",
    "EXPIRED,SUSPENDED",
    "EXPIRED,VERIFICATION_REQUIRED",
    "TERMINATED,ACTIVE",
    "TERMINATED,SUSPENDED",
    "TERMINATED,EXPIRED",
    "TERMINATED,TERMINATED",
    "TERMINATED,VERIFICATION_REQUIRED",
    "VERIFICATION_REQUIRED,ACTIVE",
    "VERIFICATION_REQUIRED,EXPIRED",
    "VERIFICATION_REQUIRED,VERIFICATION_REQUIRED"
  })
  void ac01_undocumentedEdgesAreRejected(TenantStatus from, TenantStatus to) {
    assertThat(TenantStatusTransition.isAllowed(from, to)).isFalse();
    assertThat(TenantStatusTransition.allowedFrom(from)).doesNotContain(to);
  }

  @Test
  void ac01_activeAllowsExactlyThreeTargets() {
    assertThat(TenantStatusTransition.allowedFrom(TenantStatus.ACTIVE))
        .containsExactlyInAnyOrder(
            TenantStatus.SUSPENDED, TenantStatus.EXPIRED, TenantStatus.TERMINATED);
  }

  @Test
  void ac01_suspendedAndExpiredAllowActiveOrTerminated() {
    Set<TenantStatus> expected = EnumSet.of(TenantStatus.ACTIVE, TenantStatus.TERMINATED);
    assertThat(TenantStatusTransition.allowedFrom(TenantStatus.SUSPENDED))
        .containsExactlyInAnyOrderElementsOf(expected);
    assertThat(TenantStatusTransition.allowedFrom(TenantStatus.EXPIRED))
        .containsExactlyInAnyOrderElementsOf(expected);
  }

  @Test
  void ac01_verificationAllowsSuspendOrTerminate_M2_LIFE_004() {
    assertThat(TenantStatusTransition.allowedFrom(TenantStatus.VERIFICATION_REQUIRED))
        .containsExactlyInAnyOrder(TenantStatus.SUSPENDED, TenantStatus.TERMINATED);
  }

  @ParameterizedTest
  @EnumSource(
      value = TenantStatus.class,
      names = {"TERMINATED"})
  void ac01_terminatedHasNoAdminTransitions(TenantStatus from) {
    assertThat(TenantStatusTransition.allowedFrom(from)).isEmpty();
  }
}
