package com.nammamedmate.server.domain;

import java.time.Duration;
import java.time.Instant;

public final class PasswordPolicy {

  public static final int MIN_LENGTH = 8;
  public static final int EXPIRY_DAYS = 90;

  private PasswordPolicy() {}

  public static boolean meetsMinimumLength(String password) {
    return password != null && password.length() >= MIN_LENGTH;
  }

  public static boolean isExpired(Instant passwordChangedAt, Instant now) {
    if (passwordChangedAt == null || now == null) {
      return false;
    }
    return now.isAfter(passwordChangedAt.plus(Duration.ofDays(EXPIRY_DAYS)));
  }

  public static boolean mustChange(
      boolean mustChangePassword, Instant passwordChangedAt, Instant now) {
    return mustChangePassword || isExpired(passwordChangedAt, now);
  }
}
