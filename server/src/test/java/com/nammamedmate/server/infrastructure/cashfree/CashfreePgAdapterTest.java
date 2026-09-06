package com.nammamedmate.server.infrastructure.cashfree;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.header;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.method;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;

import com.nammamedmate.server.domain.PlanCode;
import java.util.UUID;
import java.util.concurrent.atomic.AtomicInteger;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.mock.http.client.MockClientHttpRequest;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestClient;

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

  @Test
  void configuredCreatePostsPgOrderWithClientSecret() {
    RestClient.Builder builder = RestClient.builder();
    MockRestServiceServer server = MockRestServiceServer.bindTo(builder).build();
    server
        .expect(requestTo("https://sandbox.cashfree.com/pg/orders"))
        .andExpect(method(HttpMethod.POST))
        .andExpect(header("x-client-id", "cf-id"))
        .andExpect(header("x-client-secret", "cf-secret"))
        .andExpect(
            request -> {
              assertThat(request.getURI().toString()).doesNotContain("/subscriptions");
              assertThat(request.getHeaders().get("x-secret-id")).isNull();
              String payload = ((MockClientHttpRequest) request).getBodyAsString();
              assertThat(payload).contains("\"order_amount\":699.00");
              assertThat(payload).doesNotContain("/pg/subscriptions");
            })
        .andRespond(
            withSuccess(
                "{\"payment_session_id\":\"sess_1\",\"order_id\":\"nmm_2\"}",
                MediaType.APPLICATION_JSON));
    CashfreePgAdapter adapter =
        new CashfreePgAdapter(builder.build(), "cf-id", "cf-secret", "sandbox");
    CashfreeOrderResult result =
        adapter.createOrder(
            new CashfreeCreateOrderRequest(
                "nmm_2", UUID.randomUUID(), PlanCode.STARTER, 69900, "http://localhost:5173"));
    assertThat(result.paymentSessionId()).isEqualTo("sess_1");
    assertThat(result.checkoutUrl()).contains("sess_1");
    server.verify();
  }
}
