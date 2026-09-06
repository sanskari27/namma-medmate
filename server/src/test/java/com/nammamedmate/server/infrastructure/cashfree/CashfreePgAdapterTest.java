package com.nammamedmate.server.infrastructure.cashfree;

import static org.assertj.core.api.Assertions.assertThat;

import com.nammamedmate.server.domain.PlanCode;
import java.util.UUID;
import java.util.concurrent.atomic.AtomicInteger;
import org.junit.jupiter.api.Test;

class CashfreePgAdapterTest {

  @Test
  void blankKeysSkipCreate() {
    CashfreePgAdapter adapter = new CashfreePgAdapter("", "", "sandbox");
    assertThat(adapter.configured()).isFalse();
    assertThat(
            adapter.createOrder(
                new CashfreeCreateOrderRequest(
                    "nmm_1", UUID.randomUUID(), PlanCode.STARTER, 69900, "http://localhost:5173")))
        .isNull();
  }

  @Test
  void injectedCreatorIsUsed() {
    AtomicInteger calls = new AtomicInteger();
    CashfreePgAdapter adapter =
        CashfreePgAdapter.withClients(
            request -> {
              calls.incrementAndGet();
              return new CashfreeOrderResult(request.orderId(), "session", "https://pay.test");
            },
            orderId -> java.util.Optional.empty());
    assertThat(adapter.configured()).isTrue();
    CashfreeOrderResult result =
        adapter.createOrder(
            new CashfreeCreateOrderRequest(
                "nmm_2", UUID.randomUUID(), PlanCode.STARTER, 69900, "http://localhost:5173"));
    assertThat(result.checkoutUrl()).isEqualTo("https://pay.test");
    assertThat(calls.get()).isEqualTo(1);
  }

  @Test
  void webhookSignatureAcceptsMatchingHmacOnly() throws Exception {
    String secret = "hook-secret";
    String timestamp = "1710000000";
    String body = "{\"type\":\"PAYMENT_SUCCESS_WEBHOOK\"}";
    javax.crypto.Mac mac = javax.crypto.Mac.getInstance("HmacSHA256");
    mac.init(
        new javax.crypto.spec.SecretKeySpec(
            secret.getBytes(java.nio.charset.StandardCharsets.UTF_8), "HmacSHA256"));
    String signature =
        java.util.Base64.getEncoder()
            .encodeToString(
                mac.doFinal((timestamp + body).getBytes(java.nio.charset.StandardCharsets.UTF_8)));
    assertThat(CashfreeWebhookSignature.valid(secret, timestamp, body, signature)).isTrue();
    assertThat(CashfreeWebhookSignature.valid(secret, timestamp, body, "nope")).isFalse();
    assertThat(CashfreeWebhookSignature.valid("", timestamp, body, signature)).isFalse();
  }
}
