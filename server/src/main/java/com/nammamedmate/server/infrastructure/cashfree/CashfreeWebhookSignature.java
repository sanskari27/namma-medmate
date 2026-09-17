package com.nammamedmate.server.infrastructure.cashfree;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Clock;
import java.util.Base64;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;

public final class CashfreeWebhookSignature {

  static final long MAX_SKEW_SECONDS = 300;

  private CashfreeWebhookSignature() {}

  public static boolean valid(
      String secret, String timestamp, String body, String signature, Clock clock) {
    if (blank(secret) || blank(timestamp) || body == null || blank(signature) || clock == null) {
      return false;
    }
    if (!fresh(timestamp, clock)) {
      return false;
    }
    byte[] expected = hmac(secret.getBytes(StandardCharsets.UTF_8), timestamp + body);
    try {
      byte[] provided = Base64.getDecoder().decode(signature.trim());
      return MessageDigest.isEqual(expected, provided);
    } catch (IllegalArgumentException ignored) {
      return false;
    }
  }

  private static byte[] hmac(byte[] key, String payload) {
    try {
      Mac mac = Mac.getInstance("HmacSHA256");
      mac.init(new SecretKeySpec(key, "HmacSHA256"));
      return mac.doFinal(payload.getBytes(StandardCharsets.UTF_8));
    } catch (Exception ex) {
      throw new IllegalStateException("Unable to verify Cashfree signature");
    }
  }

  private static boolean fresh(String timestamp, Clock clock) {
    long epochSeconds;
    try {
      epochSeconds = Long.parseLong(timestamp.trim());
    } catch (NumberFormatException ignored) {
      return false;
    }
    return Math.abs(clock.instant().getEpochSecond() - epochSeconds) <= MAX_SKEW_SECONDS;
  }

  private static boolean blank(String value) {
    return value == null || value.isBlank();
  }
}
