package com.nammamedmate.server.domain;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.Duration;
import java.time.Instant;
import org.junit.jupiter.api.Test;

class PasswordPolicyTest {

  private static final Instant NOW = Instant.parse("2026-09-02T12:00:00Z");

  @Test
  void ac01_rejectsPasswordsShorterThanEightCharacters() {
    assertThat(PasswordPolicy.meetsMinimumLength("1234567")).isFalse();
    assertThat(PasswordPolicy.meetsMinimumLength("")).isFalse();
    assertThat(PasswordPolicy.meetsMinimumLength(null)).isFalse();
  }

  @Test
  void ac01_acceptsPasswordsWithAtLeastEightCharacters() {
    assertThat(PasswordPolicy.meetsMinimumLength("12345678")).isTrue();
    assertThat(PasswordPolicy.meetsMinimumLength("counter-pass-1")).isTrue();
  }

  @Test
  void ac02_passwordIsNotExpiredBeforeNinetyDays() {
    Instant changed = NOW.minus(Duration.ofDays(90));
    assertThat(PasswordPolicy.isExpired(changed, NOW)).isFalse();
    assertThat(PasswordPolicy.mustChange(false, changed, NOW)).isFalse();
  }

  @Test
  void ac02_passwordExpiresAfterNinetyDays() {
    Instant changed = NOW.minus(Duration.ofDays(90)).minusSeconds(1);
    assertThat(PasswordPolicy.isExpired(changed, NOW)).isTrue();
    assertThat(PasswordPolicy.mustChange(false, changed, NOW)).isTrue();
  }

  @Test
  void ac04_mustChangeFlagForcesChangeEvenWhenNotExpired() {
    assertThat(PasswordPolicy.mustChange(true, NOW, NOW)).isTrue();
  }
}
