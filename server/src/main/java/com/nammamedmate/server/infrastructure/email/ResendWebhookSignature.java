package com.nammamedmate.server.infrastructure.email;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Clock;
import java.util.Base64;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;

public final class ResendWebhookSignature {

  static final long MAX_SKEW_SECONDS = 300;

  private ResendWebhookSignature() {}

  public static boolean valid(
      String secret, String svixId, String timestamp, String body, String header, Clock clock) {
    if (blank(secret)
        || blank(svixId)
        || blank(timestamp)
        || body == null
        || blank(header)
        || clock == null) {
      return false;
    }
    if (!fresh(timestamp, clock)) {
      return false;
    }
    byte[] expected = hmac(secretBytes(secret), svixId + "." + timestamp + "." + body);
    for (String part : header.trim().split("\\s+")) {
      String encoded = part.startsWith("v1,") ? part.substring(3) : part;
      try {
        byte[] provided = Base64.getDecoder().decode(encoded);
        if (MessageDigest.isEqual(expected, provided)) {
          return true;
        }
      } catch (IllegalArgumentException ignored) {
        // try next signature
      }
    }
    return false;
  }

  private static byte[] secretBytes(String secret) {
    if (secret.startsWith("whsec_")) {
      return Base64.getDecoder().decode(secret.substring("whsec_".length()));
    }
    return secret.getBytes(StandardCharsets.UTF_8);
  }

  private static byte[] hmac(byte[] key, String payload) {
    try {
      Mac mac = Mac.getInstance("HmacSHA256");
      mac.init(new SecretKeySpec(key, "HmacSHA256"));
      return mac.doFinal(payload.getBytes(StandardCharsets.UTF_8));
    } catch (Exception ex) {
      throw new IllegalStateException("Unable to verify webhook signature");
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
