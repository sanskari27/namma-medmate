package com.nammamedmate.server.domain;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;

class TenantSlugTest {

  @Test
  void fromBusinessNameNormalizesToSlug() {
    assertThat(TenantSlug.fromBusinessName("Varshmaan Pharmacy")).isEqualTo("varshmaan-pharmacy");
    assertThat(TenantSlug.fromBusinessName("  Asha  RX  ")).isEqualTo("asha-rx");
    assertThat(TenantSlug.fromBusinessName("!!!")).isEqualTo("pharmacy");
  }
}
