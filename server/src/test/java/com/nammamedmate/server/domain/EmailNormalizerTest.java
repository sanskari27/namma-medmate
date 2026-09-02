package com.nammamedmate.server.domain;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;

class EmailNormalizerTest {

  @Test
  void ac01_trimsAndLowercases() {
    assertThat(EmailNormalizer.normalize("  OWNER@Pharmacy.Local "))
        .isEqualTo("owner@pharmacy.local");
  }
}
