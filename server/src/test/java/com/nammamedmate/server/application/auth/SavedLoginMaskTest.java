package com.nammamedmate.server.application.auth;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;

class SavedLoginMaskTest {

  @Test
  void masksLocalPartAfterFirstCharacter() {
    assertThat(SavedLoginService.maskEmail("ops@hq.local")).isEqualTo("o***@hq.local");
    assertThat(SavedLoginService.maskEmail("a@till.local")).isEqualTo("a***@till.local");
  }
}
