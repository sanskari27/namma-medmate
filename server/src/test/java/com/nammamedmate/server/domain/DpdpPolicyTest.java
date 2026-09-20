package com.nammamedmate.server.domain;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.Duration;
import org.junit.jupiter.api.Test;

class DpdpPolicyTest {

  @Test
  void ac01_matrixCoversEveryPersonalDataCategory() {
    assertThat(DpdpPolicy.matrix())
        .hasSize(6)
        .allSatisfy(
            category -> {
              assertThat(category.code()).isNotBlank();
              assertThat(category.purpose()).isNotBlank();
              assertThat(category.accessRole()).isNotBlank();
              assertThat(category.retentionErasure()).isNotBlank();
              assertThat(category.exportRule()).isNotBlank();
              assertThat(category.accountableOwner()).isNotBlank();
            });
    assertThat(DpdpPolicy.matrix().stream().map(DpdpCategory::code))
        .containsExactlyInAnyOrder(
            "CUSTOMER", "STAFF", "DOCTOR", "SUPPLIER", "OWNER_KYC", "MASTER");
    assertThat(DpdpPolicy.DECISION_DEADLINE).isEqualTo(Duration.ofDays(30));
  }
}
