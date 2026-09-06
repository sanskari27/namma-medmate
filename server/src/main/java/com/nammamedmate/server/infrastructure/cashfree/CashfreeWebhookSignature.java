package com.nammamedmate.server.infrastructure.cashfree;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.Base64;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;

public final class CashfreeWebhookSignature {

  private CashfreeWebhookSignature() {}

  public static boolean valid(String secret, String timestamp, String body, String signature) {
    if (blank(secret) || blank(timestamp) || body == null || blank(signature)) {
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

  private static boolean blank(String value) {
    return value == null || value.isBlank();
  }
}
