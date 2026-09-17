package com.nammamedmate.server.infrastructure.email;

import static org.assertj.core.api.Assertions.assertThat;

import java.nio.charset.StandardCharsets;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.Base64;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import org.junit.jupiter.api.Test;

class ResendWebhookSignatureTest {

  @Test
  void rejectsStaleTimestamp() throws Exception {
    String secret = "hook-secret";
    String svixId = "msg_1";
    String timestamp = "1709999699";
    String body = "{\"type\":\"email.sent\"}";
    Clock clock = Clock.fixed(Instant.ofEpochSecond(1_710_000_000L), ZoneOffset.UTC);
    String signature = "v1," + sign(secret, svixId + "." + timestamp + "." + body);
    assertThat(ResendWebhookSignature.valid(secret, svixId, timestamp, body, signature, clock))
        .isFalse();
  }

  @Test
  void acceptsFreshMatchingHmac() throws Exception {
    String secret = "hook-secret";
    String svixId = "msg_1";
    String timestamp = "1710000000";
    String body = "{\"type\":\"email.sent\"}";
    Clock clock = Clock.fixed(Instant.ofEpochSecond(1_710_000_000L), ZoneOffset.UTC);
    String signature = "v1," + sign(secret, svixId + "." + timestamp + "." + body);
    assertThat(ResendWebhookSignature.valid(secret, svixId, timestamp, body, signature, clock))
        .isTrue();
  }

  private static String sign(String secret, String payload) throws Exception {
    Mac mac = Mac.getInstance("HmacSHA256");
    mac.init(new SecretKeySpec(secret.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
    return Base64.getEncoder()
        .encodeToString(mac.doFinal(payload.getBytes(StandardCharsets.UTF_8)));
  }
}
